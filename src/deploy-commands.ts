import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { customCommand } from './commands/custom-game';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID');
  process.exit(1);
}

const rest = new REST().setToken(token);
const body = [customCommand.toJSON()];

void (async () => {
  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body,
      });
      console.log(`Registered guild application commands for guild ${guildId}.`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body });
      console.log(
        'Registered global application commands (can take up to an hour to appear).',
      );
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
