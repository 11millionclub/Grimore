import { router } from 'expo-router';
import { View } from 'react-native';

import { Press, Text } from '@/components/ui';
import type { ReadingStats } from '@/services/stats';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { fmt } from '@/utils/dates';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function Bars({ values, labels, highlight }: { values: number[]; labels: string[]; highlight?: number }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...values);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 84, marginTop: spacing.md }}>
      {values.map((v, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }} accessibilityLabel={`${labels[i]}: ${v}`}>
          <View style={{ width: '100%', height: Math.max(3, (v / max) * 60), borderRadius: 3, backgroundColor: i === highlight ? colors.accent : colors.surface3 }} />
          <Text variant="micro" tone="faint">
            {labels[i]}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Deeper reading numbers: all-time totals, records, authors, decades, ratings, rhythms. */
export function MoreStats({ s }: { s: ReadingStats }) {
  const { colors } = useTheme();
  const m = s.more;
  const card = { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base } as const;
  const tiles: [string, string][] = [
    [fmt(m.allTimeBooks), 'books read, all time'],
    [fmt(m.allTimePages), 'pages read, all time'],
    [m.avgLength ? fmt(m.avgLength) : '—', 'average book length'],
    [fmt(m.readingDays), 'days you logged pages'],
    [String(m.reading), 'reading now'],
    [fmt(m.wantToRead), 'on your wishlist'],
  ];
  const rmax = Math.max(1, ...m.ratings);
  const book = (label: string, b: { id: string; title: string; pages?: number | null } | null, extra: string) =>
    b ? (
      <Press key={label} onPress={() => router.push({ pathname: '/book/[id]', params: { id: b.id } })} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 6 }}>
        <Text variant="small" tone="muted">
          {label}
        </Text>
        <Text variant="small" style={{ fontFamily: fonts.semibold, flex: 1, textAlign: 'right' }} numberOfLines={1}>
          {b.title} · {extra}
        </Text>
      </Press>
    ) : null;
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {tiles.map(([v, l]) => (
          <View key={l} style={[card, { width: '48.5%', flexGrow: 1 }]}>
            <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 30 }}>{v}</Text>
            <Text variant="caption" tone="muted">
              {l}
            </Text>
          </View>
        ))}
      </View>

      <View style={card}>
        <Text variant="bodyStrong">Records</Text>
        {book('Longest', m.longest, `${fmt(m.longest?.pages ?? 0)} pages`)}
        {book('Shortest', m.shortest, `${fmt(m.shortest?.pages ?? 0)} pages`)}
        {m.fastest ? book('Fastest read', m.fastest.b, `${m.fastest.days} ${m.fastest.days === 1 ? 'day' : 'days'}`) : null}
        {book('Oldest', m.oldest, String(m.oldest?.year ?? ''))}
      </View>

      <View style={card}>
        <Text variant="bodyStrong">Books finished each month</Text>
        <Bars values={m.booksByMonth} labels={MONTHS} highlight={new Date().getMonth()} />
      </View>

      <View style={card}>
        <Text variant="bodyStrong">Pages by day of the week</Text>
        <Bars values={m.weekdays} labels={DAYS} highlight={m.weekdays.indexOf(Math.max(...m.weekdays))} />
      </View>

      {m.topAuthors.length ? (
        <View style={card}>
          <Text variant="bodyStrong">Most read authors</Text>
          {m.topAuthors.map((a, i) => (
            <View key={a.name} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text variant="small">
                {i + 1}. {a.name}
              </Text>
              <Text variant="small" tone="muted">
                {a.n} {a.n === 1 ? 'book' : 'books'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {m.ratings.some((n) => n) ? (
        <View style={card}>
          <Text variant="bodyStrong">How you rate</Text>
          {[6, 5, 4, 3, 2, 1].map((star) => (
            <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 }}>
              <Text variant="small" style={{ width: 28 }}>
                {star}★
              </Text>
              <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surface2, overflow: 'hidden' }}>
                <View style={{ width: `${(m.ratings[star - 1] / rmax) * 100}%`, height: '100%', backgroundColor: colors.gold }} />
              </View>
              <Text variant="caption" tone="muted" style={{ width: 24, textAlign: 'right' }}>
                {m.ratings[star - 1]}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {m.decades.length ? (
        <View style={card}>
          <Text variant="bodyStrong">When your books were written</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
            {m.decades.map((d) => (
              <View key={d.decade} style={{ borderRadius: radius.full, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text variant="small">
                  {d.decade}s · {d.n}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
