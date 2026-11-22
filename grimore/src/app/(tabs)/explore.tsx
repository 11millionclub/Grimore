import { AppActions } from '@/components/app-actions';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { BookShelfRow, CommunityCard, CommunityCover, openCommunity } from '@/components/books';
import { ArrowsLeftRightIcon, BellIcon, CaretRightIcon, CompassRoseIcon, MagnifyingGlassIcon, PlusIcon } from '@/components/icons';
import { ARCH_ICONS } from '@/components/onboarding-flow';
import { Avatar, Btn, Chip, Cover, EmptyState, Press, Screen, SectionHead, Segmented, Skeleton, Stagger, Text, toast } from '@/components/ui';
import { useMyId, useMyProfile } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { listCommunities, suggestedCommunities, type Community } from '@/services/communities';
import { becauseYouRead, booksByGenreSlug, classics, genreTiles, trendingBooks } from '@/services/discover';
import { ListingTile } from '@/components/listing-tile';
import { demandForMyBooks, listListings, money, type MarketFilter } from '@/services/market';
import { suggestReaders } from '@/services/profile';
import { follow, unfollow } from '@/services/social';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { ARCHETYPES, type Arch } from '@/utils/archetypes';

type Seg = 'foryou' | 'communities' | 'market';

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
        <Segmented
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'foryou', label: 'For you' },
            { value: 'communities', label: 'Communities' },
            { value: 'market', label: 'Market' },
          ]}
        />
      </View>
      <Animated.View key={seg} entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}>
        {seg === 'foryou' ? <ForYou /> : seg === 'communities' ? <Communities /> : <Market />}
      </Animated.View>
    </Screen>
  );
}

function ForYou() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const profile = useMyProfile();
  const arch = (profile.data?.archetype ?? null) as Arch | null;
  const ArchIcon = arch ? ARCH_ICONS[arch] : CompassRoseIcon;
  const qc = useQueryClient();
  const comms = useQuery({ queryKey: ['communities', 'suggested'], queryFn: () => suggestedCommunities(10) });
  const readers = useQuery({ queryKey: ['readers', 'suggested', arch], queryFn: () => suggestReaders(me, arch, 10) });
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
        <Press onPress={() => router.push('/dna')} style={{ overflow: 'hidden', borderRadius: radius.card, backgroundColor: colors.surface, padding: spacing.lg }}>
          <View pointerEvents="none" style={{ position: 'absolute', right: -50, top: -50, width: 170, height: 170, borderRadius: 85, borderWidth: 1, borderColor: colors.gold, opacity: 0.35 }} />
          <View pointerEvents="none" style={{ position: 'absolute', right: -20, top: -20, width: 110, height: 110, borderRadius: 55, borderWidth: 1, borderColor: colors.gold, opacity: 0.25 }} />
          <ArchIcon size={24} weight="fill" color={colors.accent} />
          <Text variant="small" tone="muted" style={{ marginTop: spacing.md }}>
            Your reader profile
          </Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 31, marginTop: 2 }}>{arch ? ARCHETYPES[arch].name : 'Take the reader test'}</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4, maxWidth: 300 }}>
            {arch ? ARCHETYPES[arch].traits : 'Four questions, two minutes. We use it to suggest books and people.'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.md }}>
            <Text variant="small" tone="accent" style={{ fontFamily: fonts.semibold }}>
              See your Reader DNA
            </Text>
            <CaretRightIcon size={14} weight="bold" color={colors.accent} />
          </View>
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
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {u.archetype ? ARCHETYPES[u.archetype as Arch]?.name : `@${u.username}`}
                  </Text>
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
                  {g.more ? 'Thousands of books' : `${g.count} books`}
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
  const list = useQuery({ queryKey: ['communities', f], queryFn: () => listCommunities(f) });
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.base, gap: spacing.sm }}>
        <Chip active={f === 'all'} onPress={() => setF('all')}>
          All
        </Chip>
        <Chip active={f === 'free'} onPress={() => setF('free')}>
          Free
        </Chip>
        <Chip active={f === 'paid'} onPress={() => setF('paid')}>
          With membership
        </Chip>
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        {list.isLoading ? (
          [0, 1, 2].map((k) => <Skeleton key={k} height={108} rounded={radius.card} />)
        ) : (list.data ?? []).length === 0 ? (
          <EmptyState title="No communities yet" body="Be the first: start a book club for the people who read like you." />
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
      </View>
    </View>
  );
}

function Market() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const profile = useMyProfile();
  const [f, setF] = useState<MarketFilter>('all');
  const list = useQuery({ queryKey: ['market', f, profile.data?.city], queryFn: () => listListings(f, profile.data?.city) });
  const demand = useQuery({ queryKey: ['market', 'demand', me], queryFn: () => demandForMyBooks(me) });
  const filters: [MarketFilter, string][] = [
    ['all', 'Everything'],
    ['sale', 'For sale'],
    ['trade', 'Trade'],
    ['near', profile.data?.city ? `In ${profile.data.city}` : 'Near me'],
    ['rare', 'Rare editions'],
  ];
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.base, gap: spacing.sm }}>
        {filters.map(([v, l]) => (
          <Chip key={v} active={f === v} onPress={() => (v === 'near' && !profile.data?.city ? router.push('/profile/edit') : setF(v))}>
            {l}
          </Chip>
        ))}
      </ScrollView>
      <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.base, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: 14 }}>
        <ArrowsLeftRightIcon size={22} color={colors.accent} />
        <Text variant="small" tone="muted" style={{ flex: 1 }}>
          {demand.data ? (
            <>
              <Text variant="small" style={{ fontFamily: fonts.semibold }}>
                {demand.data} {demand.data === 1 ? 'reader wants' : 'readers want'}
              </Text>{' '}
              books you have already read.
            </>
          ) : (
            'Sell or swap the books you have finished.'
          )}
        </Text>
        <Btn size="sm" onPress={() => router.push('/sell')}>
          Sell
        </Btn>
      </View>
      {list.isLoading ? (
        <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg }}>
          <Skeleton width="48%" height={220} rounded={radius.card} />
          <Skeleton width="48%" height={220} rounded={radius.card} />
        </View>
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState icon={<BellIcon size={24} color={colors.muted} />} title="Nothing here, for now" body="Open a book and switch on an alert: we tell you when someone lists it." />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, columnGap: spacing.md, rowGap: spacing.lg }}>
          {(list.data ?? []).map((l, i) => (
            <Stagger key={l.id} i={i} style={{ width: '47.5%' }}>
              <ListingTile l={l} />
            </Stagger>
          ))}
        </View>
      )}
    </View>
  );
}
