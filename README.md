# STS2 Wheel (Discord bot)

Slash command **`/custom game`** rolls randomized Slay the Spire 2 custom game settings (1–4 players, classes, ascension, modes, modifiers) and replies with an embed plus the wheel image.

## Setup

1. Copy `.env.example` to `.env` and set `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`. Optionally set `DISCORD_GUILD_ID` so commands register to one server immediately during development.
2. `npm install`
3. `npm run deploy-commands` whenever command definitions change.
4. `npm run dev` to run with hot reload, or `npm run build && npm start` for production.

## Discord Developer Portal

- Create an application and bot user.
- **Privileged intents** are not required for slash-only usage.
- Generate an invite with scopes **`bot`** and **`applications.commands`**, and permissions such as **Send Messages**, **Embed Links**, and **Attach Files**.

## Ephemeral replies

To make the roll visible only to the user who ran the command, set `ephemeral: true` on the `interaction.reply` in `src/commands/custom-game.ts`.

## GitHub

1. Create a **new empty** repository on GitHub (no README/license if you will push an existing tree).
2. In this project folder:

```bash
git init
git add .
git commit -m "Initial commit: STS2 wheel Discord bot"
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

## Heroku

Use a **worker** dyno (Discord bots do not listen on `PORT` like a web app).

1. [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) logged in: `heroku login`
2. Create the app (pick your region/name):

```bash
heroku create your-app-name
```

3. Set config (no `.env` on Heroku — use config vars):

```bash
heroku config:set DISCORD_TOKEN=your_bot_token DISCORD_CLIENT_ID=your_application_id -a your-app-name
```

Optional **`DISCORD_GUILD_ID`**: if set, slash commands are registered to **that server only** and show up quickly. If **unset**, commands are **global** (every server the bot is in), which can take up to about an hour to appear after deploy. You do **not** need to remove your Discord server; only change whether this ID is set.

4. Link and deploy:

```bash
heroku git:remote -a your-app-name
git push heroku main
```

5. Start the worker (required once per app):

```bash
heroku ps:scale worker=1 -a your-app-name
```

Each deploy runs **`release`**: `node dist/deploy-commands.js` (re-registers slash commands), then **`worker`**: `node dist/index.js` (the bot). Build runs via `heroku-postbuild` → `npm run build`.
