# Audible Scrapper

A hobby project to automate the extraction of Audible book information for easy entry into your personal database.

## Overview

This tool takes an Audible book URL, cleans it, extracts relevant information, and prints it as a flattened array. The output can be pasted directly into your database using the companion script, `PasteArray.ahk`, by pressing `Alt+q`.

## Features

- Accepts an Audible book URL as input.
- Extracts and flattens book information (e.g., title, author, narrator, length, release date, etc.).
- Outputs the data in an array format suitable for pasting.
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

2. **Copy the Value Array.**

3. **Set up AutoHotkey:**
    - Paste the Value Array into `PasteArray.ahk` line 2 and save the file.
    - Launch `PasteArray.ahk` (double-click the file or run it with AutoHotkey).

4. **Paste into your database:**
    - With `PasteArray.ahk` running, press `Alt+q` to paste the array into your database entry form.

## Example

```sh
> node .\audible-scrapper.js --url="https://www.audible.com/pd/example-book"
```

Or

```sh
> node .\audible-scrapper.js
Audible link: https://www.audible.com/pd/example-book
```

Output:
```
{
    "title": "",
    "author": "",
    "narrator": [],
    "link": "",
    "category": "",
    "publisher": "",
    "date": "",
    "publisher": "",
    "date": "",
    "genre": []
}

Value array: []
```
