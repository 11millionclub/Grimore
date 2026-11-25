import { AVATAR_OPTIONS, avatarSvg, DEFAULT_AVATAR, randomAvatar } from '../avatar';

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
