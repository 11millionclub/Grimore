import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Avatar, Press, Text } from '@/components/ui';
import { mmss, type BoardRow } from '@/services/games';
import { fonts, radius, spacing, useTheme } from '@/theme';

export function BoardRowView({ r, first, week }: { r: BoardRow; first?: boolean; week?: boolean }) {
  const { colors } = useTheme();
  const name = r.is_me ? 'You' : r.display_name ?? r.username;
  return (
    <Animated.View layout={LinearTransition}>
      <Press
        disabled={r.is_me}
        onPress={() => router.push({ pathname: '/user/[username]', params: { username: r.username } })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderTopWidth: first ? 0 : 1, borderTopColor: colors.line, backgroundColor: r.is_me ? colors.accentSoft : 'transparent' }}
      >
        <Text variant="callout" tone={r.rank === 1 ? 'accent' : 'muted'} style={{ width: 20, fontFamily: fonts.bold }}>
          {r.rank}
        </Text>
        <Avatar uri={r.avatar_url} name={r.display_name ?? r.username} size={34} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="callout" style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" tone="muted">
            {week ? `${r.won ?? 0} won this week` : `${r.tries ?? 1} ${r.tries === 1 ? 'try' : 'tries'}`}
          </Text>
        </View>
        <Text style={{ fontFamily: fonts.monoBold, fontSize: 15 }}>{mmss(r.time_seconds)}</Text>
      </Press>
    </Animated.View>
  );
}

export function Board({ rows, played, compact, week }: { rows: BoardRow[]; played: boolean; compact?: boolean; week?: boolean }) {
  const { colors } = useTheme();
  const shown = compact ? rows.slice(0, 4) : rows;
  const mine = rows.find((r) => r.is_me);
  return (
    <View style={{ marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden' }}>
      {shown.map((r, i) => (
        <BoardRowView key={r.user_id} r={r} first={i === 0} week={week} />
      ))}
      {compact && mine && mine.rank > 4 ? <BoardRowView r={mine} week={week} /> : null}
      {rows.length === 0 ? (
        <Text variant="small" tone="muted" style={{ padding: spacing.base }}>
          {played ? 'Nobody you follow has solved it yet.' : 'You have not played yet. Your time appears here.'}
        </Text>
      ) : !played && !week ? (
        <Text variant="small" tone="muted" style={{ padding: spacing.base, borderTopWidth: 1, borderTopColor: colors.line }}>
          You have not played yet. Your time appears here.
        </Text>
      ) : null}
    </View>
  );
}
