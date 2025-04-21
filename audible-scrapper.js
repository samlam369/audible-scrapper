const {Builder, By, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const minimist = require('minimist');

const readline = require('readline');

async function runScraper(url) {
    // Remove query params from URL for output
    const cleanUrl = url.split('?')[0];

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
    try {
        await driver.get(url);
        // Wait for digitalData to be available
        await driver.wait(async () => {
            return await driver.executeScript('return typeof digitalData !== "undefined" && digitalData.product && digitalData.product[0]');
        }, 10000);

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

        // Extract publishing date from DOM
        let date = '';
        // First, try to extract from shadowRoot as suggested by user
        try {
            let releaseDateText = await driver.executeScript(() => {
                try {
                    // Traverse to the shadow DOM and get the text content
                    const meta = document.querySelector('#center-1-2 > adbl-style-scope > adbl-product-details > adbl-product-metadata');
                    if (!meta || !meta.shadowRoot) return '';
                    const el = meta.shadowRoot.querySelector('#container > div:nth-child(1) > div.values > div > div.text');
                    return el ? el.textContent.trim() : '';
                } catch (e) { return ''; }
            });
            if (releaseDateText) {
                // Try to convert MM-DD-YY or MM/DD/YY or similar to YYYY/MM/DD
                let d = releaseDateText.match(/(\d{2})[\/-](\d{2})[\/-](\d{2,4})/);
                if (d) {
                    let y = d[3];
                    if (y.length === 2) {
                        y = parseInt(y) < 50 ? '20' + y : '19' + y;
                    }
                    date = `${y}/${d[1]}/${d[2]}`;
                }
            }
        } catch (e) {console.error('[DEBUG] Error extracting releaseDate from shadowRoot:', e);}

        // Fallback: previous methods
        if (!date) {
            try {
                let releaseDateRaw = '';
                for (let i = 0; i < 10; ++i) {
                    releaseDateRaw = await driver.executeScript(() => {
                        const meta = document.querySelector('adbl-product-metadata');
                        if (!meta) return '';
                        const scripts = Array.from(meta.querySelectorAll(':scope > script[type="application/json"]'));
                        for (const script of scripts) {
                            try {
                                const data = JSON.parse(script.textContent);
                                if (data.releaseDate) return data.releaseDate;
                            } catch (e) {}
                        }
                        return '';
                    });
                    if (releaseDateRaw) break;
                    await new Promise(res => setTimeout(res, 500));
                }
                if (releaseDateRaw) {
                    let d = releaseDateRaw.match(/(\d{2})-(\d{2})-(\d{2,4})/);
                    if (d) {
                        let y = d[3];
                        if (y.length === 2) {
                            y = parseInt(y) < 50 ? '20' + y : '19' + y;
                        }
                        date = `${y}/${d[1]}/${d[2]}`;
                    }
                }
            } catch (e) {console.error('[DEBUG] Error extracting releaseDate from JSON:', e);}
        }

        // Fallback: old logic (labels and meta tags)
        if (!date) {
            try {
                const labels = await driver.findElements(By.xpath("//*[contains(text(),'Release date') or contains(text(),'Published') or contains(text(),'Publication date')]/following-sibling::*[1]"));
                if (labels.length > 0) {
                    let rawDate = await labels[0].getText();
                    let d = rawDate.match(/(\d{2,4})[\/-](\d{2})[\/-](\d{2,4})/);
                    if (d) {
                        let y = d[1].length === 4 ? d[1] : d[3];
                        let m = d[1].length === 4 ? d[2] : d[1];
                        let day = d[1].length === 4 ? d[3] : d[2];
                        date = `${y}/${m}/${day}`;
                    } else {
                        let d2 = rawDate.match(/([A-Za-z]+) (\d{1,2}), (\d{4})/);
                        if (d2) {
                            const months = {January:'01',February:'02',March:'03',April:'04',May:'05',June:'06',July:'07',August:'08',September:'09',October:'10',November:'11',December:'12'};
                            let mm = months[d2[1]] || '01';
                            date = `${d2[3]}/${mm}/${d2[2].padStart(2,'0')}`;
                        }
                    }
                }
            } catch (e) {}
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
        console.log('Values array:', JSON.stringify(flatValues));
    } finally {
        await driver.quit();
    }
}

(async function main() {
    const argv = minimist(process.argv.slice(2));
    let url = argv.url;
    if (!url) {
        // Prompt for URL
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        url = await new Promise((resolve) => {
            rl.question('Audible link: ', (answer) => {
                rl.close();
                resolve(answer.trim());
            });
        });
    }
    if (!url) {
        console.error('No URL provided. Exiting.');
        process.exit(1);
    }
    await runScraper(url);
})();
