import { AVATAR_OPTIONS, avatarSvg, decodeAvatar, DEFAULT_AVATAR, encodeAvatar, randomAvatar } from '../avatar';

describe('avatar', () => {
  it('draws every combination of hair and accessory as valid SVG', () => {
    for (let hair = 0; hair < AVATAR_OPTIONS.hair.length; hair++)
      for (let accessory = 0; accessory < AVATAR_OPTIONS.accessory.length; accessory++) {
        const svg = avatarSvg({ ...DEFAULT_AVATAR, hair, accessory });
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg).not.toContain('undefined');
        expect(svg).not.toContain('NaN');
      }
  });
  it('random avatars stay within the options', () => {
    const a = randomAvatar();
    for (const [k, v] of Object.entries(a)) expect(v).toBeLessThan(AVATAR_OPTIONS[k as keyof typeof AVATAR_OPTIONS].length);
  });
});


describe('avatar codes', () => {
  it('round-trips and matches the database format', () => {
    const c = { ...DEFAULT_AVATAR, hair: 6, accessory: 5 };
    const code = encodeAvatar(c);
    expect(code).toMatch(/^avatar:v1:[0-9]{1,2}(\.[0-9]{1,2}){7}$/);
    expect(decodeAvatar(code)).toEqual(c);
  });
  it('ignores anything else', () => {
    expect(decodeAvatar('https://example.com/a.png')).toBeNull();
    expect(decodeAvatar('avatar:v1:1.2')).toBeNull();
    expect(decodeAvatar(null)).toBeNull();
  });
});
