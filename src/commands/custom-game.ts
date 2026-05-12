import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { rollDaily } from '../lib/randomizeDaily';

/** Teal accent aligned with wheel art */
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
  const players = interaction.options.getInteger('players', true);
  const roll = rollDaily(players);

  const rosterLines = roll.roster
    .map((c, i) => `**Player ${i + 1}:** ${c}`)
    .join('\n');

  const positiveText =
    roll.positiveDisplay === 'None of the above'
      ? 'None of the above'
      : roll.positiveDisplay.join(', ');

  const badText = roll.badEffects.join(', ');

  const wheelPath = path.join(process.cwd(), 'assets', 'wheel.png');
  if (!existsSync(wheelPath)) {
    await interaction.reply({
      content: 'Missing bot asset `assets/wheel.png`.',
      ephemeral: true,
    });
    return;
  }

  const attachment = new AttachmentBuilder(wheelPath, { name: 'wheel.png' });

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle('Slay the Spire 2 — custom game')
    .setDescription('Your randomized settings for this run.')
    .setImage('attachment://wheel.png')
    .addFields(
      { name: 'Ascension', value: String(roll.ascension), inline: true },
      { name: 'Mode', value: roll.primaryMode, inline: true },
      { name: 'Modifiers', value: positiveText, inline: false },
      { name: 'Bad effects', value: badText, inline: false },
      { name: 'Roster', value: rosterLines, inline: false },
    )
    .setFooter({ text: 'Daily roll' })
    .setTimestamp(new Date());

  await interaction.reply({ embeds: [embed], files: [attachment] });
}
