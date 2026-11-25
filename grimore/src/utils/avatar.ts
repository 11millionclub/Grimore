/**
 * Illustrated avatars: a face built from parts (skin, face shape, hair and
 * hair colour, eyes, brows, mouth, accessory, background), drawn as one SVG.
 * Kept as a plain string so the same picture can be shown and exported to PNG.
 */
export type AvatarConfig = {
  bg: number;
  skin: number;
  face: number;
  hair: number;
  hairColor: number;
  eyes: number;
  mouth: number;
  accessory: number;
};

export const AVATAR_OPTIONS = {
  bg: ['#E8D19B', '#B77B83', '#263C30', '#54202A', '#25170F', '#8FA8C8', '#C9B6E4', '#F2E9D8'],
  skin: ['#F6D7C3', '#EBC1A1', '#D9A27E', '#B97A56', '#8D5A3B', '#5E3A25'],
  face: ['Round', 'Oval', 'Soft square'],
  hair: ['Short', 'Long', 'Bun', 'Curly', 'Bob', 'Fringe', 'Braids', 'Bald'],
  hairColor: ['#1F1612', '#4A2E1C', '#8A5A2B', '#C99A50', '#E6CF8A', '#A3361F', '#8C8C8C', '#6C4FA0'],
  eyes: ['Dots', 'Smiling', 'Bright', 'Sleepy'],
  mouth: ['Smile', 'Grin', 'Calm', 'Oh'],
  accessory: ['None', 'Round glasses', 'Square glasses', 'Earrings', 'Crown', 'Witch hat', 'Flower', 'Headband'],
} as const;

export type AvatarPart = keyof typeof AVATAR_OPTIONS;
export const AVATAR_PARTS: { key: AvatarPart; label: string }[] = [
  { key: 'skin', label: 'Skin' },
  { key: 'face', label: 'Face' },
  { key: 'hair', label: 'Hair' },
  { key: 'hairColor', label: 'Hair colour' },
  { key: 'eyes', label: 'Eyes' },
  { key: 'mouth', label: 'Mouth' },
  { key: 'accessory', label: 'Accessory' },
  { key: 'bg', label: 'Background' },
];

export const DEFAULT_AVATAR: AvatarConfig = { bg: 0, skin: 1, face: 0, hair: 1, hairColor: 1, eyes: 2, mouth: 0, accessory: 0 };

export function randomAvatar(): AvatarConfig {
  const pick = (k: AvatarPart) => Math.floor(Math.random() * AVATAR_OPTIONS[k].length);
  return { bg: pick('bg'), skin: pick('skin'), face: pick('face'), hair: pick('hair'), hairColor: pick('hairColor'), eyes: pick('eyes'), mouth: pick('mouth'), accessory: pick('accessory') };
}

const GOLD = '#C69A43';
const INK = '#1C1410';

/** The avatar as an SVG document (viewBox 0 0 120 120). */
export function avatarSvg(c: AvatarConfig, size = 120): string {
  const bg = AVATAR_OPTIONS.bg[c.bg] ?? AVATAR_OPTIONS.bg[0];
  const skin = AVATAR_OPTIONS.skin[c.skin] ?? AVATAR_OPTIONS.skin[0];
  const hairC = AVATAR_OPTIONS.hairColor[c.hairColor] ?? AVATAR_OPTIONS.hairColor[0];
  const parts: string[] = [];
  parts.push(`<rect width="120" height="120" fill="${bg}"/>`);
  parts.push(`<circle cx="60" cy="60" r="56" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>`);

  // Hair behind the head.
  const back: Record<number, string> = {
    1: `<path d="M30 52 C30 30 90 30 90 52 L94 104 C80 110 40 110 26 104 Z" fill="${hairC}"/>`,
    4: `<path d="M32 50 C32 30 88 30 88 50 L88 82 C80 86 40 86 32 82 Z" fill="${hairC}"/>`,
    6: `<path d="M32 52 C32 30 88 30 88 52 L88 70 L32 70 Z" fill="${hairC}"/><rect x="26" y="66" width="10" height="38" rx="5" fill="${hairC}"/><rect x="84" y="66" width="10" height="38" rx="5" fill="${hairC}"/>`,
    3: `<g fill="${hairC}">${[...Array(12)].map((_, i) => `<circle cx="${60 + 32 * Math.cos((i / 12) * Math.PI * 2)}" cy="${54 + 30 * Math.sin((i / 12) * Math.PI * 2)}" r="12"/>`).join('')}</g>`,
  };
  if (back[c.hair]) parts.push(back[c.hair]);

  // Neck and shoulders.
  parts.push(`<rect x="52" y="78" width="16" height="16" fill="${skin}"/>`);
  parts.push(`<path d="M22 120 C24 98 40 90 60 90 C80 90 96 98 98 120 Z" fill="${INK}" fill-opacity="0.82"/>`);
  parts.push(`<path d="M50 90 L60 100 L70 90" fill="none" stroke="${GOLD}" stroke-width="2"/>`);

  // Head.
  const head = [
    `<circle cx="60" cy="56" r="26" fill="${skin}"/>`,
    `<ellipse cx="60" cy="57" rx="23" ry="28" fill="${skin}"/>`,
    `<rect x="35" y="30" width="50" height="54" rx="20" fill="${skin}"/>`,
  ][c.face] ?? '';
  parts.push(head);
  parts.push(`<ellipse cx="34.5" cy="58" rx="4" ry="6" fill="${skin}"/><ellipse cx="85.5" cy="58" rx="4" ry="6" fill="${skin}"/>`);
  // Blush.
  parts.push(`<ellipse cx="45" cy="66" rx="5" ry="3" fill="#E0796F" fill-opacity="0.28"/><ellipse cx="75" cy="66" rx="5" ry="3" fill="#E0796F" fill-opacity="0.28"/>`);

  // Eyes.
  const eyes = [
    `<circle cx="50" cy="57" r="3" fill="${INK}"/><circle cx="70" cy="57" r="3" fill="${INK}"/>`,
    `<path d="M45 58 Q50 53 55 58" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M65 58 Q70 53 75 58" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    `<circle cx="50" cy="57" r="4.2" fill="${INK}"/><circle cx="70" cy="57" r="4.2" fill="${INK}"/><circle cx="51.4" cy="55.6" r="1.4" fill="#fff"/><circle cx="71.4" cy="55.6" r="1.4" fill="#fff"/>`,
    `<path d="M45 57 L55 57" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><path d="M65 57 L75 57" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`,
  ][c.eyes] ?? '';
  parts.push(eyes);
  parts.push(`<path d="M45 49 Q50 46 55 48" stroke="${hairC}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M65 48 Q70 46 75 49" stroke="${hairC}" stroke-width="2" fill="none" stroke-linecap="round"/>`);

  // Mouth.
  const mouth = [
    `<path d="M53 69 Q60 74 67 69" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    `<path d="M52 68 Q60 78 68 68 Z" fill="${INK}"/><path d="M54.5 69.5 Q60 72 65.5 69.5" fill="#fff"/>`,
    `<path d="M55 70 L65 70" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`,
    `<ellipse cx="60" cy="70.5" rx="3.4" ry="4" fill="${INK}"/>`,
  ][c.mouth] ?? '';
  parts.push(mouth);

  // Hair on top of the head.
  const front: Record<number, string> = {
    0: `<path d="M34 50 C34 20 86 20 86 50 C80 40 66 36 52 40 C44 42 38 46 34 50 Z" fill="${hairC}"/>`,
    1: `<path d="M34 54 C32 20 88 20 86 54 C78 38 60 36 46 42 C40 45 36 50 34 54 Z" fill="${hairC}"/>`,
    2: `<circle cx="60" cy="22" r="11" fill="${hairC}"/><path d="M34 50 C34 20 86 20 86 50 C78 38 42 38 34 50 Z" fill="${hairC}"/>`,
    3: `<g fill="${hairC}">${[...Array(7)].map((_, i) => `<circle cx="${38 + i * 7.4}" cy="${36 + (i % 2) * 4}" r="8"/>`).join('')}</g>`,
    4: `<path d="M33 60 C30 20 90 20 87 60 L84 60 C82 46 74 40 60 40 C46 40 38 46 36 60 Z" fill="${hairC}"/>`,
    5: `<path d="M34 52 C34 20 86 20 86 52 L86 48 C70 48 58 44 50 36 C46 44 40 48 34 52 Z" fill="${hairC}"/>`,
    6: `<path d="M34 50 C34 20 86 20 86 50 C78 38 42 38 34 50 Z" fill="${hairC}"/>`,
    7: ``,
  };
  parts.push(front[c.hair] ?? '');

  // Accessory.
  const acc = [
    ``,
    `<g fill="none" stroke="${GOLD}" stroke-width="2"><circle cx="50" cy="57" r="7"/><circle cx="70" cy="57" r="7"/><path d="M57 57 L63 57 M43 56 L36 54 M77 56 L84 54"/></g>`,
    `<g fill="none" stroke="${INK}" stroke-width="2.2"><rect x="42" y="51" width="15" height="11" rx="2"/><rect x="63" y="51" width="15" height="11" rx="2"/><path d="M57 56 L63 56"/></g>`,
    `<circle cx="34" cy="66" r="2.6" fill="${GOLD}"/><circle cx="86" cy="66" r="2.6" fill="${GOLD}"/>`,
    `<path d="M42 32 L46 18 L53 27 L60 14 L67 27 L74 18 L78 32 Z" fill="${GOLD}" stroke="#8A6420" stroke-width="1"/><circle cx="60" cy="24" r="2" fill="#B77B83"/>`,
    `<path d="M28 36 L92 36 L80 30 L66 4 L54 30 L40 30 Z" fill="${INK}"/><rect x="40" y="29" width="40" height="5" fill="${GOLD}"/>`,
    `<g transform="translate(78 36)"><circle r="4" cx="0" cy="-5" fill="#E8A0B0"/><circle r="4" cx="5" cy="0" fill="#E8A0B0"/><circle r="4" cx="0" cy="5" fill="#E8A0B0"/><circle r="4" cx="-5" cy="0" fill="#E8A0B0"/><circle r="3" fill="${GOLD}"/></g>`,
    `<path d="M35 42 C44 32 76 32 85 42" fill="none" stroke="#B77B83" stroke-width="5" stroke-linecap="round"/>`,
  ][c.accessory] ?? '';
  parts.push(acc);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 120 120">${parts.join('')}</svg>`;
}

const ORDER: AvatarPart[] = ['bg', 'skin', 'face', 'hair', 'hairColor', 'eyes', 'mouth', 'accessory'];
const PREFIX = 'avatar:v1:';

/** The avatar as the short code saved on the profile, e.g. "avatar:v1:0.1.0.1.1.2.0.0". */
export function encodeAvatar(c: AvatarConfig): string {
  return PREFIX + ORDER.map((k) => c[k]).join('.');
}

/** The avatar a saved code describes, or null when it isn't one. */
export function decodeAvatar(value: string | null | undefined): AvatarConfig | null {
  if (!value?.startsWith(PREFIX)) return null;
  const n = value.slice(PREFIX.length).split('.').map(Number);
  if (n.length !== ORDER.length || n.some((x) => !Number.isInteger(x) || x < 0)) return null;
  const out = {} as AvatarConfig;
  ORDER.forEach((k, i) => {
    out[k] = Math.min(n[i], AVATAR_OPTIONS[k].length - 1);
  });
  return out;
}
