import { AppActions } from '@/components/app-actions';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { BookShelfRow, CommunityCard, CommunityCover, openCommunity } from '@/components/books';
import { CaretRightIcon, KeyIcon, MagnifyingGlassIcon, PlusIcon, SlidersHorizontalIcon, XIcon } from '@/components/icons';
import { Avatar, Btn, Chip, Cover, EmptyState, Press, Screen, SectionHead, Segmented, Skeleton, Stagger, Text, toast } from '@/components/ui';
import { HouseBadge } from '@/components/house-badge';
import { Sigil } from '@/components/sigil';
import { useMyHouse, useMyId, useReaderHouses } from '@/hooks/queries';
import { useDebounced } from '@/hooks/use-debounced';
import { useTranslation } from '@/i18n';
import { HOUSE_NAMES, houseTokens } from '@/theme/houses';
import { toAppError } from '@/lib/errors';
import { listCommunities, suggestedCommunities, type Community, type CommunitySort } from '@/services/communities';
import { becauseYouRead, booksByGenreSlug, classics, genreTiles, trendingBooks } from '@/services/discover';
import { money } from '@/utils/money';
import { suggestReaders } from '@/services/profile';
import { follow, unfollow } from '@/services/social';
import { fonts, radius, spacing, useTheme } from '@/theme';

type Seg = 'foryou' | 'communities';

export default function Explore() {
  const { colors } = useTheme();
  const [seg, setSeg] = useState<Seg>('foryou');
  return (
    <Screen title="Explore" tabs actions={<AppActions />}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md }}>
        <Press onPress={() => router.push('/search')} accessibilityRole="search" style={{ height: 44, borderRadius: radius.full, backgroundColor: colors.surface2, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.base }}>
          <MagnifyingGlassIcon size={19} color={colors.muted} />
          <Text variant="body" tone="faint">
            Books, authors, ISBN
          </Text>
        </Press>
        <Press accessibilityRole="button" onPress={() => router.push('/discover')} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: spacing.base, paddingVertical: spacing.md }}>
          <SlidersHorizontalIcon size={18} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Find by mood, trope or spice</Text>
            <Text variant="caption" tone="muted">
              Cosy, dark, enemies to lovers, slow burn, short reads…
            </Text>
          </View>
          <CaretRightIcon size={14} color={colors.muted} />
        </Press>
        <Segmented
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'foryou', label: 'For you' },
            { value: 'communities', label: 'Communities' },
          ]}
        />
      </View>
      <Animated.View key={seg} entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}>
        {seg === 'foryou' ? <ForYou /> : <Communities />}
      </Animated.View>
    </Screen>
  );
}

function ForYou() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const { t } = useTranslation();
  const myHouse = useMyHouse();
  const h = myHouse.data?.house ?? null;
  const qc = useQueryClient();
  const comms = useQuery({ queryKey: ['communities', 'suggested'], queryFn: () => suggestedCommunities(10) });
  const readers = useQuery({ queryKey: ['readers', 'suggested'], queryFn: () => suggestReaders(me, 10) });
  const readerHouses = useReaderHouses((readers.data ?? []).map((u) => u.id));
  const trending = useQuery({ queryKey: ['discover', 'trending'], queryFn: () => trendingBooks(8) });
  const because = useQuery({ queryKey: ['discover', 'because', me], queryFn: () => becauseYouRead(me) });
  const sagas = useQuery({ queryKey: ['discover', 'fantasy'], queryFn: () => booksByGenreSlug('fantasy', 10) });
  const old = useQuery({ queryKey: ['discover', 'classics'], queryFn: () => classics(10) });
  const tiles = useQuery({ queryKey: ['discover', 'genres'], queryFn: genreTiles, staleTime: 60 * 60_000 });
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const toggle = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => (on ? follow(me, id) : unfollow(me, id)),
    onError: (e) => toast(toAppError(e).message),
    onSettled: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  return (
    <View>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Press onPress={() => router.push('/house')} style={{ overflow: 'hidden', borderRadius: radius.card, backgroundColor: h ? houseTokens[h].primary : colors.surface, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
          {h ? <Sigil house={h} size={48} color={houseTokens[h].onPrimary} /> : null}
          <View style={{ flex: 1 }}>
            <Text variant="small" color={h ? houseTokens[h].onPrimary : colors.muted}>
              {t('house.title')}
            </Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 28 }} color={h ? houseTokens[h].onPrimary : colors.ink}>
              {h ? HOUSE_NAMES[h] : '—'}
            </Text>
            {h ? (
              <Text variant="small" color={houseTokens[h].onPrimary} style={{ fontStyle: 'italic' }}>
                {t(`houses.${h}.motto`)}
              </Text>
            ) : null}
          </View>
          <CaretRightIcon size={18} weight="bold" color={h ? houseTokens[h].onPrimary : colors.muted} />
        </Press>
      </View>

      {(comms.data ?? []).length ? (
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHead title="Communities for you" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            {(comms.data ?? []).map((c) => (
              <CommunityCard key={c.id} c={c} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {(readers.data ?? []).length ? (
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHead title="Readers like you" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            {(readers.data ?? []).map((u) => {
              const on = followed.has(u.id);
              return (
                <View key={u.id} style={{ width: 148, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
                  <Press onPress={() => router.push({ pathname: '/user/[username]', params: { username: u.username } })} accessibilityLabel={`Open ${u.display_name ?? u.username}`}>
                    <Avatar uri={u.avatar_url} name={u.display_name ?? u.username} size={64} />
                  </Press>
                  <Text variant="callout" style={{ fontFamily: fonts.semibold, marginTop: 10 }} numberOfLines={1}>
                    {(u.display_name ?? u.username).split(' ')[0]}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <HouseBadge house={readerHouses.data?.[u.id]} size={14} />
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      @{u.username}
                    </Text>
                  </View>
                  <Btn
                    size="sm"
                    full
                    variant={on ? 'secondary' : 'inverse'}
                    style={{ marginTop: spacing.md }}
                    onPress={() => {
                      setFollowed((s) => {
                        const n = new Set(s);
                        if (on) n.delete(u.id);
                        else n.add(u.id);
                        return n;
                      });
                      toggle.mutate({ id: u.id, on: !on });
                    }}
                  >
                    {on ? 'Following' : 'Follow'}
                  </Btn>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <BookShelfRow title="Trending this week" books={trending.data ?? []} width={108} numbered />
      {because.data ? <BookShelfRow title={because.data.title} books={because.data.books} /> : null}
      <BookShelfRow title="For saga lovers" books={sagas.data ?? []} />
      <BookShelfRow title="Classics worth a reread" books={old.data ?? []} />

      {(tiles.data ?? []).length ? (
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHead title="Browse by genre" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: spacing.lg }}>
            {(tiles.data ?? []).map((g) => (
              <Press
                key={g.id}
                onPress={() => router.push({ pathname: '/shelf/[id]', params: { id: `genre:${g.id}`, name: g.name } })}
                style={{ width: '48.5%', height: 84, overflow: 'hidden', borderRadius: radius.card, backgroundColor: colors.surface, padding: spacing.md }}
              >
                <Text variant="bodyStrong" style={{ zIndex: 2 }}>
                  {g.name}
                </Text>
                <Text variant="caption" tone="muted" style={{ zIndex: 2 }}>
                  {g.more ? 'Many books' : `${g.count} books`}
                </Text>
                <View style={{ position: 'absolute', bottom: -12, right: -8, flexDirection: 'row' }}>
                  {g.covers.map((b, i) => (
                    <View key={b.id} style={{ transform: [{ rotate: `${12 + i * 8}deg` }, { translateX: -i * 14 }] }}>
                      <Cover uri={b.cover_url} title={b.title} width={42} />
                    </View>
                  ))}
                </View>
              </Press>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Communities() {
  const { colors } = useTheme();
  const [f, setF] = useState<'all' | 'free' | 'paid'>('all');
  const [sort, setSort] = useState<CommunitySort>('popular');
  const [reading, setReading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const term = useDebounced(search.trim(), 300);
  const list = useQuery({ queryKey: ['communities', f, sort, reading, open, term], queryFn: () => listCommunities({ filter: f, sort, reading, open, search: term }), placeholderData: (prev) => prev });
  const filtered = f !== 'all' || reading || open || term.length >= 2;
  return (
    <View>
      <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md, height: 44, borderRadius: radius.full, backgroundColor: colors.surface2, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.base }}>
        <MagnifyingGlassIcon size={19} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search communities"
          placeholderTextColor={colors.faint}
          accessibilityLabel="Search communities"
          autoCapitalize="none"
          returnKeyType="search"
          style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as object}
        />
        {search ? (
          <Press accessibilityLabel="Clear search" onPress={() => setSearch('')} hitSlop={8}>
            <XIcon size={16} color={colors.muted} />
          </Press>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm }}>
        <Chip active={f === 'all'} onPress={() => setF('all')}>
          All
        </Chip>
        <Chip active={f === 'free'} onPress={() => setF('free')}>
          Free
        </Chip>
        <Chip active={f === 'paid'} onPress={() => setF('paid')}>
          With membership
        </Chip>
        <Chip active={reading} onPress={() => setReading((x) => !x)}>
          Reading a book now
        </Chip>
        <Chip active={open} onPress={() => setOpen((x) => !x)}>
          Has space
        </Chip>
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.base, gap: spacing.sm, alignItems: 'center' }}>
        <Text variant="caption" tone="muted">
          Sort
        </Text>
        {(
          [
            ['popular', 'Most members'],
            ['new', 'Newest'],
            ['name', 'A–Z'],
          ] as const
        ).map(([k, label]) => (
          <Chip key={k} active={sort === k} onPress={() => setSort(k)}>
            {label}
          </Chip>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        {list.isLoading ? (
          [0, 1, 2].map((k) => <Skeleton key={k} height={108} rounded={radius.card} />)
        ) : (list.data ?? []).length === 0 ? (
          filtered ? (
            <EmptyState title="Nothing matches" body="Try other words or fewer filters." />
          ) : (
            <EmptyState title="No communities yet" body="Be the first: start a book club for the people who read like you." />
          )
        ) : (
          (list.data ?? []).map((c: Community, i) => (
            <Stagger key={c.id} i={i}>
              <Press onPress={() => openCommunity(c.id)} style={{ flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md }}>
                <View style={{ width: 84, height: 84, borderRadius: radius.tile, overflow: 'hidden' }}>
                  <CommunityCover c={c} height={84} />
                </View>
                <View style={{ flex: 1, minWidth: 0, paddingVertical: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
                    <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                      {c.name}
                    </Text>
                    <View style={{ borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: c.price_cents ? colors.accentSoft : colors.surface2 }}>
                      <Text variant="micro" tone={c.price_cents ? 'accent' : 'muted'}>
                        {c.price_cents ? `${money(c.price_cents)}/mo` : 'Free'}
                      </Text>
                    </View>
                  </View>
                  <Text variant="small" tone="muted" numberOfLines={2} style={{ marginTop: 2 }}>
                    {c.tagline ?? c.description ?? 'A reading community'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm }}>
                    <Avatar uri={c.host?.avatar_url} name={c.host?.display_name} size={16} />
                    <Text variant="caption" tone="muted">
                      {(c.host?.display_name ?? c.host?.username ?? '').split(' ')[0]} · {c.member_count} members
                    </Text>
                  </View>
                </View>
              </Press>
            </Stagger>
          ))
        )}
      </View>
      <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.xl, borderRadius: radius.card, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.lineStrong, padding: spacing.lg, alignItems: 'center' }}>
        <Text variant="bodyStrong">Do you run a book club?</Text>
        <Text variant="small" tone="muted" align="center" style={{ marginTop: 4 }}>
          Bring together people who read like you. Open to everyone, or with tiers for members.
        </Text>
        <Btn variant="secondary" size="sm" icon={<PlusIcon size={14} weight="bold" color={colors.ink} />} onPress={() => router.push('/community/new')} style={{ marginTop: spacing.md, alignSelf: 'center' }}>
          Create a community
        </Btn>
        <Press accessibilityRole="link" onPress={() => router.push('/community/invite/enter')} style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <KeyIcon size={14} color={colors.accent} />
          <Text variant="small" tone="accent" style={{ fontFamily: fonts.semibold }}>
            Have an invite code?
          </Text>
        </Press>
      </View>
    </View>
  );
}


