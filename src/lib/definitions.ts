import type {
  BadEffect,
  ClassName,
  PositiveModifier,
  PrimaryMode,
} from './randomizeDaily';

/** Display label for primary mode (internal roll still uses `Sealed`). */
export function primaryModeLabel(mode: PrimaryMode): string {
  if (mode === 'Sealed') return 'Sealed Deck';
  return mode;
}

export const PRIMARY_MODE_DEFINITION: Record<PrimaryMode, string> = {
  Draft:
    'Choose 10 card rewards to replace your starting deck.',
  Sealed:
    'Choose 10 out of 30 cards to replace your starting deck.',
  Insanity: 'Start with a random deck of 30 cards.',
  None: 'No Draft, Sealed Deck, or Insanity modifier.',
};

export const POSITIVE_MODIFIER_DEFINITION: Record<PositiveModifier, string> = {
  Hoarder:
    'Whenever you add a card to your deck, add 2 additional copies. You can no longer remove cards from your deck at the merchant.',
  Specialized: 'Start with 5 copies of a single card.',
  'All Star': 'Start with 5 colorless cards.',
  Flight:
    'You may ignore paths when choosing the next room to travel to.',
  Vintage: 'Normal enemies drop relics instead of cards.',
  'Ironclad Cards':
    "That class's cards will now appear in rewards and shops.",
  'Silent Cards':
    "That class's cards will now appear in rewards and shops.",
  'Regent Cards':
    "That class's cards will now appear in rewards and shops.",
  'Necrobinder Cards':
    "That class's cards will now appear in rewards and shops.",
  'Defect Cards':
    "That class's cards will now appear in rewards and shops.",
};

export const BAD_EFFECT_DEFINITION: Record<BadEffect, string> = {
  'Deadly Events':
    'Unknown rooms can now contain elites, but are also more likely to contain Treasure rooms.',
  'Cursed Run':
    'At the start of each Act, add a random Curse to your deck.',
  'Big Game Hunter':
    'Elite enemies swarm the spire and drop better rewards.',
  Midas:
    'Enemies drop 200% more gold, but you can no longer Smith at Rest Sites.',
  Murderous:
    'You start each combat with 3 Strength. All enemies start combat with 3 Strength.',
  'Night Terrors':
    'Resting at Rest Sites heals all of your HP, but costs 5 Max HP.',
  Terminal:
    'Whenever you enter a new room, lose 1 Max HP. Start each combat with 5 Plating.',
};

export function classImageBasename(c: ClassName): string {
  return `${c.toLowerCase()}.png`;
}
