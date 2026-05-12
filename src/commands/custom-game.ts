import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { rollDaily } from '../lib/randomizeDaily';

const EMBED_COLOR = 0x14b8a6;

export const customCommand = new SlashCommandBuilder()
  .setName('custom')
  .setDescription('Slay the Spire 2 custom game tools')
  .addSubcommand((sub) =>
    sub
      .setName('game')
      .setDescription('Roll randomized custom game settings')
      .addIntegerOption((opt) =>
        opt
          .setName('players')
          .setDescription('Number of players (1–4)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(4),
      ),
  );

export async function handleCustomGame(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const lagMs = Date.now() - interaction.createdTimestamp;
  if (lagMs > 2500) {
    console.warn(
      `[custom game] Interaction ${interaction.id} reached deferReply after ${lagMs}ms; Discord allows ~3000ms to acknowledge.`,
    );
  }

  // Acknowledge within 3s. Heavy canvas work must NOT run on this stack — it blocks
  // other interactions' deferReply and causes DiscordAPIError[10062] Unknown interaction.
  await interaction.deferReply();

  const players = interaction.options.getInteger('players', true);
  const roll = rollDaily(players);

  setImmediate(() => {
    void (async () => {
      // Load Skia/canvas only after defer — avoids blocking the gateway thread on first
      // `require` and keeps other interactions able to acknowledge within 3s.
      let renderRollPng: typeof import('../lib/renderRollImage').renderRollPng;
      try {
        ({ renderRollPng } = await import('../lib/renderRollImage'));
      } catch (e) {
        console.error(e);
        try {
          await interaction.editReply({
            content: 'Failed to load image renderer. Check server logs.',
            embeds: [],
            files: [],
          });
        } catch (e2) {
          console.error('Failed to editReply after renderer load error', e2);
        }
        return;
      }

      let png: Buffer;
      try {
        png = await renderRollPng(roll);
      } catch (err) {
        console.error(err);
        try {
          await interaction.editReply({
            content: 'Could not generate the roll image. Check server logs.',
            embeds: [],
            files: [],
          });
        } catch (e2) {
          console.error('Failed to send error editReply', e2);
        }
        return;
      }

      const attachment = new AttachmentBuilder(png, { name: 'roll.png' });

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle('Slay the Spire 2 — custom game')
        .setDescription(
          'Rolled settings — see image for roster, ascension, mode, modifiers, and bad effects.',
        )
        .setImage('attachment://roll.png')
        .setFooter({ text: 'Daily roll' })
        .setTimestamp(new Date());

      try {
        await interaction.editReply({ embeds: [embed], files: [attachment] });
      } catch (err) {
        console.error(err);
        try {
          await interaction.editReply({
            content: 'Could not upload the roll image (try again or use smaller class PNGs).',
            embeds: [],
            files: [],
          });
        } catch (e2) {
          console.error('Failed to send error editReply', e2);
        }
      }
    })();
  });
}
