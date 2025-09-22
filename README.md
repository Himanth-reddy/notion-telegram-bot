# Notion Watchlist Telegram Bot

A powerful Telegram bot designed to automate and manage a movie and TV show watchlist in Notion. This bot fetches rich metadata from The Movie Database (TMDB), checks for duplicates, and adds items to your personal Notion database with a single command.

## About The Project

This project was built to solve the problem of manually maintaining a media watchlist. Instead of just a simple list of titles, this bot enriches each entry with valuable data like ratings, genres, release years, streaming platforms, and artwork, transforming a simple Notion page into a powerful, automated media database.

-----

## Features

  * **Add Movies & TV Shows:** Quickly add new items to your watchlist using the `/add` command.
  * **Rich Metadata:** Automatically fetches data from TMDB, including ratings, genres, year, seasons, and episode counts.
  * **Duplicate Prevention:** Checks if an item already exists in your Notion database before adding it, updating the existing entry instead.
  * **Image Previews:** Appends a high-quality backdrop image to each new Notion page.
  * **Status Management:** Easily update an item's status with commands like `/watching` and `/watched`.
  * **Flexible Search:** Search your existing watchlist directly from Telegram with `/search`.
  * **Custom Lists:** Get lists of what you're currently watching or what's on your to-watch list.

-----

## Tech Stack

This project uses a modern, modular Node.js architecture:

  * **Runtime:** [Node.js](https://nodejs.org/)
  * **Telegram Bot Framework:** [Telegraf.js](https://telegraf.js.org/)
  * **APIs:**
      * [Notion API](https://developers.notion.com/)
      * [The Movie Database (TMDB) API](https://www.themoviedb.org/documentation/api)
  * **Deployment:** [Railway](https://railway.app/)

-----

## Project Structure

The codebase is organized into a clean, maintainable structure that separates concerns into distinct layers.

```
/
├── commands/             // Handles logic for each user-facing command
│   ├── add.js
│   ├── search.js
│   └── ...
├── services/             // Handles backend logic and API connections
│   ├── notion.js
│   ├── tmdb.js
│   └── sync.js
├── .env                  // Stores secret API keys
├── bot.js                // Main file to start the bot
└── package.json
```

-----

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

  * Node.js (v18 or higher)
  * npm
  * A free [TMDB API Key](https://www.google.com/search?q=https://www.themoviedb.org/settings/api)
  * A [Notion Integration Token](https://www.notion.so/my-integrations) and a Notion Database

### Installation

1.  **Clone the repo**
    ```sh
    git clone https://github.com/your_username/notion-telegram-bot.git
    ```
2.  **Navigate to the project directory**
    ```sh
    cd notion-telegram-bot
    ```
3.  **Install NPM packages**
    ```sh
    npm install
    ```
4.  **Create your environment file**
    Create a file named `.env` in the root of the project and add your secret keys:
    ```env
    TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
    NOTION_TOKEN="YOUR_NOTION_INTEGRATION_TOKEN"
    NOTION_DB_ID="YOUR_NOTION_DATABASE_ID"
    TMDB_TOKEN="YOUR_TMDB_API_KEY"
    ```
5.  **Set up your Notion Database**
      * Make sure your Notion database has the required properties (Title, Format, IMDB, Status, etc.) that match the code in `services/sync.js`.
      * Share your database with the Notion integration you created.
  

## Deployment with Railway

Here’s how to deploy the bot using Railway:

1.  **Create a Railway Account**
    Go to **railway.app**, sign up, and connect your GitHub account.

2.  **Deploy from GitHub**

      * On your Railway dashboard, click **New Project** and select **Deploy from GitHub repo**.
      * Choose your `notion-telegram-bot` repository and click **Deploy**.

3.  **Configure Environment Variables**

      * Once deployed, go to your new service and click the **Variables** tab.
      * Add the same secret keys that are in your local `.env` file (`TELEGRAM_BOT_TOKEN`, `NOTION_TOKEN`, etc.).

4.  **Automatic Deployment**
    Railway will automatically use the `npm start` command to run your bot. You can view the live logs in the **Deployments** tab.

-----

## Usage

Interact with your bot on Telegram using the following commands:

  * `/add <title>`: Adds a new item to your watchlist.
  * `/search <title>`: Searches for an item in your list.
  * `/towatch`: Lists all items in your 'To Watch' list.
  * `/watching`: Lists all items you are currently watching.
  * `/watching <title>`: Marks an item as "Watching".
  * `/watched <title>`: Marks an item as "Watched".
