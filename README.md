# Audible Scrapper

A hobby project to automate the extraction of Audible book information for easy entry into your personal database.

## Overview

This tool takes an Audible book URL, cleans it, extracts relevant information, and prints it as a flattened array. The output can be pasted directly into your database using the companion script, `PasteArray.ahk`, by pressing `Alt+q`.

## Features

- Accepts an Audible book URL as input.
- Extracts and flattens book information (e.g., title, author, narrator, length, release date, etc.).
- Automatically copies the values array to your system clipboard.
- Outputs the data in both formatted JSON and flattened array formats.
- Integrates with `PasteArray.ahk` for quick database entry.

## Requirements

- Node.js (recommended: latest LTS version)
- npm (Node Package Manager)
- [AutoHotkey](https://www.autohotkey.com/) installed (for `PasteArray.ahk`)

## Setup

1. **Clone the repository:**
    ```sh
    git clone https://github.com/yourusername/audible-scrapper.git
    cd audible-scrapper
    ```

2. **Install dependencies:**
    ```sh
    npm install
    ```

3. **Install AutoHotkey:**
    - Make sure [AutoHotkey](https://www.autohotkey.com/) is installed.

## Usage

1. **Run the scrapper:**
    ```sh
    node audible-scrapper.js --url="<audible-book-url>"
    ```

2. **The values array is automatically copied to your clipboard!** 🎉
   - Look for the success message: `✓ Values array copied to clipboard!`
   - The array is now ready to be pasted directly into `PasteArray.ahk`

3. **Set up AutoHotkey:**
   - Open `PasteArray.ahk` and replace the array on line 5 with your copied values.
   - Launch `PasteArray.ahk` (double-click the file or run it with AutoHotkey).

4. **Paste into your database:**
    - With `PasteArray.ahk` running, press `Alt+q` to paste the array into your database entry form.

## Example

```sh
> node audible-scrapper.js --url="https://www.audible.com/pd/example-book"
```

Or

```sh
> node audible-scrapper.js
Audible link: https://www.audible.com/pd/example-book
```

Output:
```json
{
    "title": "The Zoologist's Guide to the Galaxy",
    "author": "Arik Kershenbaum",
    "narrator": ["Samuel West"],
    "link": "https://www.audible.com/pd/The-Zoologists-Guide-to-the-Galaxy-Audiobook/0593394380",
    "category": "Science & Engineering",
    "publisher": "Penguin Audio",
    "date": "2021/03/16",
    "genre": [
        "Animals",
        "Biological Sciences",
        "Evolution",
        "Evolution & Genetics",
        "Science",
        "Animal Behavior"
    ]
}

Values array: ["The Zoologist's Guide to the Galaxy","Arik Kershenbaum","Samuel West","https://www.audible.com/pd/The-Zoologists-Guide-to-the-Galaxy-Audiobook/0593394380","Science & Engineering","Penguin Audio","2021/03/16","Animals","Biological Sciences","Evolution","Evolution & Genetics","Science","Animal Behavior"]
✓ Values array copied to clipboard!
```
