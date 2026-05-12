import { randomInt } from 'node:crypto';

export const CLASSES = [
  'Ironclad',
  'Silent',
  'Regent',
  'Necrobinder',
  'Defect',
] as const;

export type ClassName = (typeof CLASSES)[number];

export const PRIMARY_MODES = ['Draft', 'Sealed', 'Insanity', 'None'] as const;
export type PrimaryMode = (typeof PRIMARY_MODES)[number];

export const POSITIVE_MODIFIERS = [
  'Hoarder',
  'Specialized',
  'All Star',
  'Flight',
  'Vintage',
  'Ironclad Cards',
  'Silent Cards',
  'Regent Cards',
  'Necrobinder Cards',
  'Defect Cards',
] as const;

export type PositiveModifier = (typeof POSITIVE_MODIFIERS)[number];

export const BAD_EFFECTS = [
  'Deadly Events',
  'Cursed Run',
  'Big Game Hunter',
  'Midas',
  'Murderous',
  'Night Terrors',
  'Terminal',
] as const;

export type BadEffect = (typeof BAD_EFFECTS)[number];

/** Per-option inclusion probability when rolling a non-empty positive set (plan: ~35%). */
export const POSITIVE_INCLUDE_P = 35;

export type DailyRoll = {
  playerCount: number;
  roster: ClassName[];
  ascension: number;
  primaryMode: PrimaryMode;
  positiveModifiers: PositiveModifier[];
  positiveDisplay: 'None of the above' | PositiveModifier[];
  badEffects: BadEffect[];
};

function rollUniformInt(minInclusive: number, maxInclusive: number): number {
  return randomInt(minInclusive, maxInclusive + 1);
}

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function rollPositiveModifiers(): {
  positiveModifiers: PositiveModifier[];
  positiveDisplay: DailyRoll['positiveDisplay'];
} {
  const picked: PositiveModifier[] = [];
  for (const name of POSITIVE_MODIFIERS) {
    if (randomInt(0, 100) < POSITIVE_INCLUDE_P) {
      picked.push(name);
    }
  }
  if (picked.length === 0) {
    return { positiveModifiers: [], positiveDisplay: 'None of the above' };
  }
  return { positiveModifiers: picked, positiveDisplay: picked };
}

function rollBadEffects(): BadEffect[] {
  const k = rollUniformInt(1, BAD_EFFECTS.length);
  const pool = [...BAD_EFFECTS];
  shuffleInPlace(pool);
  return pool.slice(0, k);
}

export function rollDaily(playerCount: number): DailyRoll {
  if (!Number.isInteger(playerCount) || playerCount < 1 || playerCount > 4) {
    throw new RangeError('playerCount must be an integer from 1 to 4');
  }

  const roster: ClassName[] = [];
  for (let i = 0; i < playerCount; i++) {
    roster.push(CLASSES[randomInt(0, CLASSES.length)]);
  }

  const ascension = rollUniformInt(0, 10);
  const primaryMode = PRIMARY_MODES[randomInt(0, PRIMARY_MODES.length)];
  const { positiveModifiers, positiveDisplay } = rollPositiveModifiers();
  const badEffects = rollBadEffects();

  return {
    playerCount,
    roster,
    ascension,
    primaryMode,
    positiveModifiers,
    positiveDisplay,
    badEffects,
  };
}
