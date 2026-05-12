import 'dotenv/config';
import {
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
} from 'discord.js';
import { handleCustomGame } from './commands/custom-game';

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
  if (interaction.options.getSubcommand() !== 'game') return;

  try {
    await handleCustomGame(interaction);
  } catch (err) {
    console.error(err);
    const payload = {
      content: 'Something went wrong while rolling the daily.',
      ephemeral: true as const,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }
});

void client.login(token);
