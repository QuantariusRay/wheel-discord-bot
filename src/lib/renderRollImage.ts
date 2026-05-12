import { existsSync } from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { Image } from '@napi-rs/canvas';
import {
  BAD_EFFECT_DEFINITION,
  classImageBasename,
  POSITIVE_MODIFIER_DEFINITION,
  PRIMARY_MODE_DEFINITION,
  primaryModeLabel,
} from './definitions';
import type { ClassName, DailyRoll } from './randomizeDaily';

const CLASSES_DIR = path.join(process.cwd(), 'assets', 'classes');

/** Tall scratch canvas so wrapped text never clips; output is cropped to content. */
const DRAW_SURFACE_HEIGHT = 10_000;

export function classImagePath(c: ClassName): string | null {
  const p = path.join(CLASSES_DIR, classImageBasename(c));
  return existsSync(p) ? p : null;
}

async function loadClassPortrait(c: ClassName): Promise<Image | null> {
  const p = classImagePath(c);
  if (!p) return null;
  try {
    return await loadImage(p);
  } catch {
    return null;
  }
}

function drawWrappedText(
  ctx: {
    fillText: (text: string, x: number, y: number) => void;
    measureText: (text: string) => { width: number };
  },
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  let cy = y;
  const paragraphs = text.split('\n');
  for (const para of paragraphs) {
    if (!para.trim()) {
      cy += lineHeight * 0.4;
      continue;
    }
    const words = para.split(/\s+/);
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, cy);
        line = word;
        cy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, x, cy);
      cy += lineHeight;
    }
  }
  return cy;
}

const BG = '#1a1d24';
const TEXT = '#e8eaed';
const MUTED = '#9aa0a6';
const ACCENT = '#14b8a6';
const PANEL = '#252a33';

export async function renderRollPng(roll: DailyRoll): Promise<Buffer> {
  const W = 980;
  const pad = 40;
  const innerW = W - pad * 2;
  const H = DRAW_SURFACE_HEIGHT;

  const rosterImages = await Promise.all(
    roll.roster.map((c) => loadClassPortrait(c)),
  );

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, W, 6);

  let y = pad + 8;

  ctx.fillStyle = TEXT;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('Slay the Spire 2 — Custom game', pad, y);
  y += 44;

  ctx.fillStyle = MUTED;
  ctx.font = '16px sans-serif';
  ctx.fillText('Randomized run settings', pad, y);
  y += 36;

  ctx.fillStyle = PANEL;
  ctx.fillRect(pad, y - 8, innerW, 72);
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1;
  ctx.strokeRect(pad, y - 8, innerW, 72);

  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Ascension', pad + 16, y + 18);
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(String(roll.ascension), pad + 140, y + 44);
  y += 92;

  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Roster', pad, y);
  y += 32;

  const slotW = Math.min(200, Math.floor((innerW - 16) / roll.roster.length));
  const slotH = 230;
  const gap = 12;
  let x = pad;
  for (let i = 0; i < roll.roster.length; i++) {
    const c = roll.roster[i];
    const img = rosterImages[i];

    ctx.fillStyle = PANEL;
    ctx.fillRect(x, y, slotW, slotH);

    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, slotW, slotH);

    const innerPad = 8;
    const portraitTop = y + innerPad + 18;
    const availH = slotH - 18 - 52 - innerPad * 2;
    const availW = slotW - innerPad * 2;

    ctx.fillStyle = MUTED;
    ctx.font = '14px sans-serif';
    ctx.fillText(`Player ${i + 1}`, x + innerPad, y + 18);

    if (img) {
      const scale = Math.min(availW / img.width, availH / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = x + (slotW - dw) / 2;
      const dy = portraitTop + (availH - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    } else {
      ctx.fillStyle = '#3d4450';
      ctx.fillRect(x + innerPad, portraitTop, availW, availH);
      ctx.fillStyle = MUTED;
      ctx.font = '13px sans-serif';
      const hint = `Add ${classImageBasename(c)} to assets/classes/`;
      drawWrappedText(
        ctx,
        hint,
        x + innerPad + 4,
        portraitTop + 12,
        availW - 8,
        16,
      );
    }

    ctx.fillStyle = TEXT;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(c, x + innerPad, y + slotH - 16);

    x += slotW + gap;
  }
  y += slotH + 28;

  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 22px sans-serif';
  const modeTitle = primaryModeLabel(roll.primaryMode);
  ctx.fillText(`Mode — ${modeTitle}`, pad, y);
  y += 28;
  ctx.fillStyle = TEXT;
  ctx.font = '17px sans-serif';
  const modeDef = PRIMARY_MODE_DEFINITION[roll.primaryMode];
  y = drawWrappedText(ctx, modeDef, pad, y, innerW, 22) + 16;

  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Modifiers', pad, y);
  y += 28;
  ctx.fillStyle = TEXT;
  ctx.font = '17px sans-serif';
  if (roll.positiveDisplay === 'None of the above') {
    y = drawWrappedText(ctx, 'None of the above', pad, y, innerW, 22) + 8;
  } else {
    for (const m of roll.positiveDisplay) {
      ctx.fillStyle = ACCENT;
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText(`• ${m}`, pad, y);
      y += 22;
      ctx.fillStyle = TEXT;
      ctx.font = '16px sans-serif';
      const def = POSITIVE_MODIFIER_DEFINITION[m];
      y = drawWrappedText(ctx, def, pad + 12, y, innerW - 12, 21) + 10;
    }
  }
  y += 8;

  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Bad effects', pad, y);
  y += 28;
  for (const b of roll.badEffects) {
    ctx.fillStyle = ACCENT;
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(`• ${b}`, pad, y);
    y += 22;
    ctx.fillStyle = TEXT;
    ctx.font = '16px sans-serif';
    const badDef = BAD_EFFECT_DEFINITION[b];
    y = drawWrappedText(ctx, badDef, pad + 12, y, innerW - 12, 21) + 10;
  }
  y += pad;

  if (y > H - pad) {
    throw new Error(
      `Roll image content exceeded internal canvas height (${H}px); increase DRAW_SURFACE_HEIGHT.`,
    );
  }

  const cropH = Math.min(H, Math.max(Math.ceil(y + pad), 400));
  const out = createCanvas(W, cropH);
  const ox = out.getContext('2d');
  ox.fillStyle = BG;
  ox.fillRect(0, 0, W, cropH);
  ox.drawImage(canvas, 0, 0, W, cropH, 0, 0, W, cropH);

  return out.toBuffer('image/png');
}
