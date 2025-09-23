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

  * **Runtime:** Node.js
  * **Telegram Bot Framework:** [Telegraf.js](https://telegraf.js.org/)
  * **APIs:**
      * [Notion API](https://developers.notion.com/)
      * [The Movie Database (TMDB) API](https://www.themoviedb.org/documentation/api)
  * **Deployment:** [Vercel](https://vercel.com/)

-----

## Project Structure

The codebase is organized into a clean, maintainable structure that separates concerns into distinct layers. Vercel automatically recognizes this structure as a serverless function.

```
/
├── api/                  // Vercel serverless functions are placed in this directory
│   ├── bot.js
├── commands/             // Handles logic for each user-facing command
│   ├── add.js
│   ├── search.js
│   └── ...
├── services/             // Handles backend logic and API connections
│   ├── notion.js
│   ├── tmdb.js
│   └── sync.js
├── .env                  // Stores secret API keys (for local development)
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
    Create a file named `.env` in the root of the project and add your secret keys for local development:
    ```env
    TELEGRAM_BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
    NOTION_TOKEN="YOUR_NOTION_INTEGRATION_TOKEN"
    NOTION_DB_ID="YOUR_NOTION_DATABASE_ID"
    TMDB_TOKEN="YOUR_TMDB_API_KEY"
    ALLOWED_CHAT_ID="YOUR_TELEGRAM_CHAT_ID"
    ```
5.  **Set up your Notion Database**
      * Make sure your Notion database has the required properties (Title, Format, IMDB, Status, etc.) that match the code in `services/sync.js`.
      * Share your database with the Notion integration you created.

## Deployment with Vercel

Here’s how to deploy the bot using Vercel's serverless platform.

1.  **Create a Vercel Account**
    Go to **vercel.com**, sign up, and connect your GitHub account.

2.  **Import Your Project**

      * From your Vercel dashboard, click **New Project** and select **Import Git Repository**.
      * Choose your `notion-telegram-bot` repository and click **Deploy**. Vercel will automatically detect that this is a Node.js project.

3.  **Configure Environment Variables**

      * Vercel does not use your local `.env` file. You must add the variables directly in the dashboard.
      * Go to your project's **Settings** \> **Environment Variables**.
      * Add the following variables with their secret values for the appropriate environments (e.g., "Production", "Preview"):
          * `TELEGRAM_BOT_TOKEN`
          * `NOTION_TOKEN`
          * `NOTION_DB_ID`
          * `TMDB_TOKEN`
          * `ALLOWED_CHAT_ID`
      * Once variables are added, they will be applied to your next deployment.

4.  **Set the Telegram Webhook**

      * After your project is deployed, your bot will be live at a URL like `https://<your-project>.vercel.app/api/bot`.
      * You need to tell Telegram to send messages to this URL. You can do this by opening the following URL in your browser, replacing the tokens and domain with your own values:
        ```
        https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<your-project-domain>.vercel.app/api/bot
        ```
      * You should see a success message like `{"ok":true,"result":true,"description":"Webhook was set"}`.

5.  **View Logs**

      * You can view real-time runtime logs from your Vercel dashboard to monitor your bot's activity and debug any issues.
      * Go to your project's **Deployments** tab and click on the latest deployment to see the logs.

-----

## Usage

Interact with your bot on Telegram using the following commands:

  * `/add <title>`: Adds a new item to your watchlist.
  * `/search <title>`: Searches for an item in your list.
  * `/towatch`: Lists all items in your 'To Watch' list.
  * `/watching`: Lists all items you are currently watching.
  * `/watching <title>`: Marks an item as "Watching".
  * `/watched <title>`: Marks an item as "Watched".