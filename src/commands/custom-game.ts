import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  type GuildMember,
  type User,
} from 'discord.js';
import { rollDaily } from '../lib/randomizeDaily';

const PLAYER_OPTION_KEYS = ['player_1', 'player_2', 'player_3', 'player_4'] as const;

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
      )
      .addUserOption((opt) =>
        opt
          .setName('player_1')
          .setDescription('Discord user for seat 1 (required for your player count)')
          .setRequired(false),
      )
      .addUserOption((opt) =>
        opt
          .setName('player_2')
          .setDescription('Discord user for seat 2 (required if players ≥ 2)')
          .setRequired(false),
      )
      .addUserOption((opt) =>
        opt
          .setName('player_3')
          .setDescription('Discord user for seat 3 (required if players ≥ 3)')
          .setRequired(false),
      )
      .addUserOption((opt) =>
        opt
          .setName('player_4')
          .setDescription('Discord user for seat 4 (required if players = 4)')
          .setRequired(false),
      ),
  );

type ResolvedMember = ReturnType<
  ChatInputCommandInteraction['options']['getMember']
>;

function atDisplay(user: User, member: ResolvedMember): string {
  if (member && typeof (member as GuildMember).displayName === 'string') {
    return `@${(member as GuildMember).displayName}`;
  }
  return `@${user.globalName ?? user.username}`;
}

/** True for `/custom game` (flat subcommand + integer `players`). */
export function isCustomGameRollInteraction(
  interaction: ChatInputCommandInteraction,
): boolean {
  if (interaction.commandName !== 'custom') return false;
  if (interaction.options.getSubcommandGroup(false) !== null) return false;
  return interaction.options.getSubcommand(false) === 'game';
}

export async function handleCustomGame(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const playerCount = interaction.options.getInteger('players', true);
  if (!Number.isInteger(playerCount) || playerCount < 1 || playerCount > 4) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: '`players` must be an integer from 1 to 4.',
    });
    return;
  }

  const seats: { user: User; member: ResolvedMember }[] = [];
  for (let i = 0; i < playerCount; i++) {
    const key = PLAYER_OPTION_KEYS[i];
    const user = interaction.options.getUser(key);
    if (!user) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content:
          `When \`players\` is **${playerCount}**, set **${PLAYER_OPTION_KEYS.slice(0, playerCount).join('**, **')}** — one Discord user per seat (shown on the roll image).`,
      });
      return;
    }
    const member = interaction.options.getMember(key);
    seats.push({ user, member });
  }

  const rosterTags = seats.map((s) => atDisplay(s.user, s.member));
  const pingContent = seats.map((s) => `<@${s.user.id}>`).join(' ');

  const lagMs = Date.now() - interaction.createdTimestamp;
  if (lagMs > 2500) {
    console.warn(
      `[custom game] Interaction ${interaction.id} reached deferReply after ${lagMs}ms; Discord allows ~3000ms to acknowledge.`,
    );
  }

  await interaction.deferReply();

  const roll = rollDaily(playerCount);

  setImmediate(() => {
    void (async () => {
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
        png = await renderRollPng(roll, rosterTags);
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
        await interaction.editReply({
          content: pingContent,
          allowedMentions: { users: seats.map((s) => s.user.id) },
          embeds: [embed],
          files: [attachment],
        });
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
