import * as Linking from 'expo-linking';
import type { ComponentType } from 'react';
import { View } from 'react-native';

import { BookOpenIcon, ButterflyIcon, GoodreadsLogoIcon, InstagramLogoIcon, ThreadsLogoIcon, TiktokLogoIcon, XLogoIcon, YoutubeLogoIcon, type IconProps } from '@/components/icons';
import { Press, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

export type SocialKey = 'instagram' | 'tiktok' | 'x' | 'threads' | 'bluesky' | 'youtube' | 'goodreads' | 'storygraph';
export type Socials = Partial<Record<SocialKey, string>>;

export const SOCIALS: { key: SocialKey; label: string; Icon: ComponentType<IconProps>; url: (h: string) => string }[] = [
  { key: 'instagram', label: 'Instagram', Icon: InstagramLogoIcon, url: (h) => `https://instagram.com/${h}` },
  { key: 'tiktok', label: 'TikTok', Icon: TiktokLogoIcon, url: (h) => `https://www.tiktok.com/@${h}` },
  { key: 'x', label: 'X', Icon: XLogoIcon, url: (h) => `https://x.com/${h}` },
  { key: 'threads', label: 'Threads', Icon: ThreadsLogoIcon, url: (h) => `https://www.threads.net/@${h}` },
  { key: 'bluesky', label: 'Bluesky', Icon: ButterflyIcon, url: (h) => `https://bsky.app/profile/${h.includes('.') ? h : `${h}.bsky.social`}` },
  { key: 'youtube', label: 'YouTube', Icon: YoutubeLogoIcon, url: (h) => `https://www.youtube.com/@${h}` },
  { key: 'goodreads', label: 'Goodreads', Icon: GoodreadsLogoIcon, url: (h) => `https://www.goodreads.com/${h}` },
  { key: 'storygraph', label: 'StoryGraph', Icon: BookOpenIcon, url: (h) => `https://app.thestorygraph.com/profile/${h}` },
];

/** "@name" -> "name"; also accepts pasted profile links. Returns '' if nothing usable. */
export function cleanHandle(raw: string) {
  const t = raw.trim().replace(/^https?:\/\/[^/]+\/(@)?/i, '').replace(/^@/, '').split(/[/?#]/)[0];
  return t.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 40);
}

export const asSocials = (v: unknown): Socials => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Socials) : {});

/** The reader's social @s as small tappable chips under the bio. */
export function SocialLinks({ socials }: { socials: unknown }) {
  const { colors } = useTheme();
  const s = asSocials(socials);
  const list = SOCIALS.filter((n) => s[n.key]);
  if (!list.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
      {list.map(({ key, label, Icon, url }) => (
        <Press
          key={key}
          accessibilityRole="link"
          accessibilityLabel={`${label}: @${s[key]}`}
          onPress={() => void Linking.openURL(url(s[key]!))}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: radius.full, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}
        >
          <Icon size={15} color={colors.ink} />
          <Text variant="small">@{s[key]}</Text>
        </Press>
      ))}
    </View>
  );
}
