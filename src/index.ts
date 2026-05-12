import 'dotenv/config';
import {
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
  MessageFlags,
} from 'discord.js';
import { handleCustomGame, isCustomGameRollInteraction } from './commands/custom-game';

function discordApiCode(e: unknown): number | undefined {
  if (typeof e !== 'object' || e === null) return undefined;
  const code = (e as { code?: unknown }).code;
  return typeof code === 'number' ? code : undefined;
}

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Missing DISCORD_TOKEN');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Ready as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'custom') return;
  if (!isCustomGameRollInteraction(interaction)) return;

  try {
    await handleCustomGame(interaction);
  } catch (err) {
    console.error(err);
    const code = discordApiCode(err);
    if (code === 10062) {
      console.error(
        '[custom game] Unknown interaction (10062): token already expired or used. ' +
          'Stop every other process using this bot token (Heroku worker, second terminal, second PC), ' +
          'then try again. If you run `node dist/index.js`, rebuild and restart after code changes.',
      );
      return;
    }
    const msg = 'Something went wrong while rolling the daily.';
    try {
      if (interaction.deferred) {
        await interaction.editReply({ content: msg, embeds: [], files: [] });
      } else if (!interaction.replied) {
        await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral });
      }
    } catch (e2) {
      console.error('Failed to notify user about command error', e2);
    }
  }
});

void client.login(token);
