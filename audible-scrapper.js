const {Builder, By, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const minimist = require('minimist');
// Using dynamic import for clipboardy ESM module
let writeToClipboard = async (text) => {
    const { default: clipboard } = await import('clipboardy');
    return clipboard.write(text);
};

const readline = require('readline');

async function runScraper(url) {
    // Remove query params from URL for output
    const cleanUrl = url.split('?')[0];
    
    // Dynamically import ora
    const { default: ora } = await import('ora');
    // Create spinner
    const spinner = ora('Loading page...').start();
    
    // Start Selenium
    let options = new chrome.Options();
    try {
        // Try new headless mode first
        options.addArguments('--headless=new');
    } catch (e) {
        // Fallback for older Chrome versions
        options.addArguments('--headless');
    }
    let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    
    // Exponential backoff parameters
    const maxRetries = 4;
    let currentRetry = 0;
    let timeoutMs = 30000; // Start with 30 seconds
    
    try {
        await driver.get(url);
        spinner.text = 'Page loaded, waiting for data to be available...';
        
        // Retry logic with exponential backoff
        let success = false;
        while (currentRetry < maxRetries && !success) {
            try {
                // Wait for digitalData to be available with current timeout
                await driver.wait(async () => {
                    return await driver.executeScript('return typeof digitalData !== "undefined" && digitalData.product && digitalData.product[0]');
                }, timeoutMs);
                success = true;
                spinner.succeed('Data loaded successfully');
            } catch (error) {
                currentRetry++;
                if (currentRetry >= maxRetries) {
                    spinner.fail(`Failed to load data after ${maxRetries} attempts`);
                    throw error;
                }
                
                // Double the timeout for the next attempt (exponential backoff)
                if (currentRetry === 1) {
                    timeoutMs = 60000; // 1 minute
                } else {
                    timeoutMs = 120000; // 2 minutes for remaining attempts
                }
                
                spinner.text = `Attempt ${currentRetry}/${maxRetries} failed. Retrying with ${timeoutMs/1000}s timeout...`;
            }
        }

        // Extract info from digitalData
        const info = await driver.executeScript(() => {
            try {
                const d = window.digitalData;
                const product = d.product && d.product[0] && d.product[0].productInfo ? d.product[0].productInfo : {};
                return {
                    title: product.productName || '',
                    author: product.authors && product.authors[0] ? product.authors[0].fullName : '',
                    narrator: Array.isArray(product.narrators) ? product.narrators : (product.narrators ? [product.narrators] : []),
                    publisher: product.publisherName || '',
                    category: d.page && d.page.category && d.page.category.primaryCategory ? d.page.category.primaryCategory : '',
                    subCategory1: d.page && d.page.category && d.page.category.subCategory1 ? d.page.category.subCategory1 : '',
                    link: window.location.origin + window.location.pathname
                };
            } catch (e) {
                return {};
            }
        });
        
        // Extract subtitle if it exists (specifically from the adbl-title-lockup element with slot="subtitle")
        let subtitle = '';
        try {
            subtitle = await driver.executeScript(() => {
                // Look specifically for the h2 with slot="subtitle" within adbl-title-lockup
                const subtitleElement = document.querySelector('adbl-title-lockup h2[slot="subtitle"]');
                return subtitleElement ? subtitleElement.textContent.trim() : '';
            });
        } catch (e) {
            console.error('[DEBUG] Error extracting subtitle:', e);
        }

        // Extract genres (as array) from <adbl-chip-group class='product-topictag-impression'>
        let genres = [];
        try {
            const genreElements = await driver.findElements(By.css('adbl-chip-group.product-topictag-impression adbl-chip'));
            for (let el of genreElements) {
                let txt = await el.getText();
                if (txt && !genres.includes(txt)) genres.push(txt);
            }
            // Fallback: try to get genre from subCategory1 and split if comma-separated
            if (genres.length === 0 && info.subCategory1) {
                genres = info.subCategory1.split(',').map(s => s.trim());
            }
        } catch (e) {}

        // Extract publishing date in MM-DD-YY format from the page
        let date = '';
        try {
            // First try to find the date directly in the page
            const dateMatch = await driver.executeScript(() => {
                // Look for the date in the format MM-DD-YY
                const dateRegex = /(\d{2}-\d{2}-\d{2})/;
                const match = document.body.textContent.match(dateRegex);
                return match ? match[0] : '';
            });

            if (dateMatch) {
                const [_, month, day, year] = dateMatch.match(/(\d{2})-(\d{2})-(\d{2})/);
                date = `20${year}/${month}/${day}`; // Assuming 21st century
            } else {
                // Fallback: Try to find by label if direct match fails
                const labels = await driver.findElements(
                    By.xpath("//*[contains(translate(., 'RELEASE', 'release'), 'release date')]")
                );

                for (const label of labels) {
                    try {
                        const valueElement = await driver.executeScript(
                            'return arguments[0].nextElementSibling;', label
                        );
                        if (valueElement) {
                            const rawDate = await valueElement.getText();
                            const match = rawDate.match(/(\d{2}-\d{2}-\d{2})/);
                            if (match) {
                                const [_, month, day, year] = match[0].match(/(\d{2})-(\d{2})-(\d{2})/);
                                date = `20${year}/${month}/${day}`;
                                break;
                            }
                        }
                    } catch (e) {
                        console.error('[DEBUG] Error processing date element:', e);
                    }
                }
            }
        } catch (e) {
            console.error('[DEBUG] Error in date extraction:', e);
        }
        if (!date) {
            try {
                const metaDate = await driver.executeScript(() => {
                    let meta = document.querySelector('meta[itemprop="datePublished"]');
                    return meta ? meta.getAttribute('content') : '';
                });
                if (metaDate) date = metaDate.replace(/-/g, '/');
            } catch (e) {}
        }

        // Compose output
        const output = {
            title: info.title || '',
            ...(subtitle ? { subtitle } : {}), // Add subtitle only if it exists
            author: info.author || '',
            narrator: Array.isArray(info.narrator) ? info.narrator.filter(Boolean) : (info.narrator ? [info.narrator] : []),
            link: cleanUrl,
            category: info.category || '',
            publisher: info.publisher || '',
            date: date,
            genre: genres.filter(Boolean)
        };
        console.log(JSON.stringify(output, null, 4));
        // Flatten array values in output
        const flatValues = Object.values(output).flatMap(v => Array.isArray(v) ? v : [v]);
        const valuesString = JSON.stringify(flatValues);
        console.log('Values array:', valuesString);
        
        try {
            await writeToClipboard(valuesString);
            console.log('✓ Values array copied to clipboard!\n');
        } catch (err) {
            console.error('Failed to copy to clipboard:', err.message);
        }
    } catch (error) {
        spinner.fail(`Error: ${error.message}`);
        throw error;
    } finally {
        spinner.stop();
        await driver.quit();
    }
}

(async function main() {
    const argv = minimist(process.argv.slice(2));
    let url = argv.url;
    
    // Create a function to prompt for URL that we can call repeatedly
    async function promptForUrl() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return new Promise((resolve) => {
            rl.question('Audible link: ', (answer) => {
                rl.close();
                resolve(answer.trim());
            });
        });
    }
    
    // If URL wasn't provided as a command line argument, prompt for it
    if (!url) {
        url = await promptForUrl();
    }
    
    // Main processing loop
    while (url) {
        if (!url) {
            console.error('No URL provided. Exiting.');
            process.exit(1);
        }
        
        // Process the current URL
        await runScraper(url);
        
        // Prompt for the next URL
        url = await promptForUrl();
    }
    
    // If we get here with no URL, exit gracefully
    console.log('No URL provided. Exiting.');
    process.exit(0);
})();
