# STS2 Wheel (Discord bot)

Slash commands **`/custom game one`** … **`four`** roll randomized Slay the Spire 2 custom game settings (each mode shows exactly that many **required** player pickers), then reply with an embed plus a **generated PNG** (roster portraits with `@` labels, ascension, mode + definitions, modifiers + definitions, bad effects). The message pings the selected users.

## Class portraits (required for images in the roll)

Add these five files next to each other under **`assets/classes/`** (exact names):

- `ironclad.png`
- `silent.png`
- `regent.png`
- `necrobinder.png`
- `defect.png`

If a file is missing, the roll image still generates and shows a placeholder box with the expected filename.

If Discord / Cursor dropped long-named copies under `assets/`, you can run:

```powershell
pwsh -File scripts/copy-class-art-from-cursor.ps1
```

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

### Heroku and `@napi-rs/canvas`

Roll images use **`@napi-rs/canvas`** (Skia native binary). On current Heroku stacks this usually installs prebuilt binaries with `npm install` like on desktop.

If the slug **fails to build** or the worker **crashes on startup** with a native-module error, try:

- Use the latest **Heroku-24** (or **Heroku-22**) stack for the app.
- Ensure **`package-lock.json`** is committed so Heroku resolves the same `@napi-rs/canvas` version.
- As a last resort, check Heroku’s Node docs and any canvas-related buildpack notes for your stack year.

Commit the five **`assets/classes/*.png`** files if you want portraits on Heroku; the bot does not bundle them automatically.
