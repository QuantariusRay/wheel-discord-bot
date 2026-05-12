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

/** Subcommand names under `game` group → seat count (Discord cannot hide options by another field). */
export const GAME_GROUP_NAME = 'game' as const;
export const GAME_MODE_SUBCOMMANDS = ['one', 'two', 'three', 'four'] as const;
export type GameModeSubcommand = (typeof GAME_MODE_SUBCOMMANDS)[number];

const MODE_TO_COUNT: Record<GameModeSubcommand, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
};

const EMBED_COLOR = 0x14b8a6;

export const customCommand = new SlashCommandBuilder()
  .setName('custom')
  .setDescription('Slay the Spire 2 custom game tools')
  .addSubcommandGroup((group) =>
    group
      .setName(GAME_GROUP_NAME)
      .setDescription('Roll a randomized custom game')
      .addSubcommand((sub) =>
        sub
          .setName('one')
          .setDescription('1 player — pick who is in seat 1')
          .addUserOption((o) =>
            o
              .setName('player_1')
              .setDescription('Seat 1')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('two')
          .setDescription('2 players — pick both seats')
          .addUserOption((o) =>
            o
              .setName('player_1')
              .setDescription('Seat 1')
              .setRequired(true),
          )
          .addUserOption((o) =>
            o
              .setName('player_2')
              .setDescription('Seat 2')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('three')
          .setDescription('3 players — pick all three seats')
          .addUserOption((o) =>
            o
              .setName('player_1')
              .setDescription('Seat 1')
              .setRequired(true),
          )
          .addUserOption((o) =>
            o
              .setName('player_2')
              .setDescription('Seat 2')
              .setRequired(true),
          )
          .addUserOption((o) =>
            o
              .setName('player_3')
              .setDescription('Seat 3')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('four')
          .setDescription('4 players — pick all four seats')
          .addUserOption((o) =>
            o
              .setName('player_1')
              .setDescription('Seat 1')
              .setRequired(true),
          )
          .addUserOption((o) =>
            o
              .setName('player_2')
              .setDescription('Seat 2')
              .setRequired(true),
          )
          .addUserOption((o) =>
            o
              .setName('player_3')
              .setDescription('Seat 3')
              .setRequired(true),
          )
          .addUserOption((o) =>
            o
              .setName('player_4')
              .setDescription('Seat 4')
              .setRequired(true),
          ),
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

export function isCustomGameRollInteraction(
  interaction: ChatInputCommandInteraction,
): boolean {
  if (interaction.commandName !== 'custom') return false;
  if (interaction.options.getSubcommandGroup(false) !== GAME_GROUP_NAME) {
    return false;
  }
  const leaf = interaction.options.getSubcommand(false);
  return GAME_MODE_SUBCOMMANDS.includes(leaf as GameModeSubcommand);
}

export async function handleCustomGame(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const leaf = interaction.options.getSubcommand(false);
  if (
    !leaf ||
    !GAME_MODE_SUBCOMMANDS.includes(leaf as GameModeSubcommand)
  ) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content:
        'Use `/custom game one` … `four` with the matching number of player fields.',
    });
    return;
  }
  const playerCount = MODE_TO_COUNT[leaf as GameModeSubcommand];

  const seats: { user: User; member: ResolvedMember }[] = [];
  for (let i = 0; i < playerCount; i++) {
    const key = PLAYER_OPTION_KEYS[i];
    const user = interaction.options.getUser(key, true);
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
