import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner, DEFAULT_LOOK, FRAMES, FramedAvatar, NAME_STYLES, PACKS, Plank, SHELVES, StyledName, THEMES, ThemeFill, type CornerLook } from '@/components/corner';
import { CaretRightIcon, CheckIcon, CrownSimpleIcon, MusicNotesIcon, PencilSimpleIcon, XIcon } from '@/components/icons';
import { Btn, Press, Text, toast } from '@/components/ui';
import { HouseBadge, ReaderMarks } from '@/components/house-badge';
import { Sigil } from '@/components/sigil';
import { useCorner, useMyHouse, useMyId, useMyProfile, useShop } from '@/hooks/queries';
import { useTranslation } from '@/i18n';
import { myItems as getMyItems } from '@/services/houses';
import { HOUSE_NAMES, houseTokens, type HouseId } from '@/theme/houses';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { ALL_WIDGETS, saveCorner, WIDGETS, type CornerItem, type Widget } from '@/services/corner';
import { money } from '@/services/market';
import { fonts, radius, spacing, useTheme } from '@/theme';

type Tab = 'house' | 'themes' | 'blocks' | 'frames' | 'shelf' | 'extras';
type Draft = CornerLook & { widgets: string[]; status_text: string; song: string };
const KIND_FIELD: Record<string, keyof CornerLook> = { theme: 'theme', frame: 'frame', shelf: 'shelf', name: 'name_style', pack: 'pack' };

export default function EditCorner() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const me = useMyId()!;
  const qc = useQueryClient();
  const profile = useMyProfile();
  const saved = useCorner(me);
  const shop = useShop();
  const [tab, setTab] = useState<Tab>('themes');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const myHouse = useMyHouse();
  const myItems = useQuery({ queryKey: ['myItems', me], queryFn: () => getMyItems(me) });
  const base: Draft = saved.data
    ? { theme: saved.data.theme, frame: saved.data.frame, shelf: saved.data.shelf, name_style: saved.data.name_style, pack: saved.data.pack, widgets: saved.data.widgets, status_text: saved.data.status_text ?? '', song: saved.data.song ?? '' }
    : { ...DEFAULT_LOOK, widgets: ['status', 'top4', 'reading', 'goal', 'quote', 'shelf', 'badges', 'genres', 'tbr', 'guestbook'], status_text: '', song: '' };
  const d = draft ?? base;
  const set = (p: Partial<Draft>) => setDraft({ ...d, ...p });
  const items = shop.data?.items ?? [];
  const owned = new Set(shop.data?.owned ?? []);
  const mine = new Set((myItems.data ?? []).filter((x) => !x.expires_at || new Date(x.expires_at).getTime() > openedAt).map((x) => x.item_key));
  const isOwned = (it: CornerItem) => {
    if (it.source === 'starter') return it.house_id === myHouse.data?.house;
    if (it.source === 'earned') return mine.has(it.key);
    return !it.price_cents || owned.has(it.key) || mine.has(it.key);
  };
  const cart = (Object.entries(KIND_FIELD) as [string, keyof CornerLook][])
    .map(([kind, field]) => items.find((i) => i.key === `${kind}:${d[field]}`))
    .filter((i): i is CornerItem => !!i && !isOwned(i));
  const total = cart.reduce((a, i) => a + (i.price_cents ?? 0), 0);

  const save = useMutation({
    mutationFn: (x?: Draft) => {
      const v = x ?? d;
      return saveCorner(me, { theme: v.theme, frame: v.frame, shelf: v.shelf, name_style: v.name_style, pack: v.pack, widgets: v.widgets, status_text: v.status_text.trim() || null, song: v.song.trim() || null });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.corner(me) });
      router.back();
      toast('Corner updated');
    },
    onError: (e) => toast(toAppError(e).message),
  });

  /** Keep free choices, swap any unowned paid item back to what was saved. */
  const keepOwnedOnly = () => {
    const next = { ...d };
    cart.forEach((it) => {
      const field = KIND_FIELD[it.kind];
      (next as Record<string, unknown>)[field] = base[field];
    });
    return next;
  };

  const kindItems = (kind: string) => items.filter((i) => i.kind === kind && (i.source ?? 'shop') === 'shop');
  const pick = (it: CornerItem) => {
    if (!KIND_FIELD[it.kind]) return it.kind === 'icon' ? toast(t('shop.iconNote')) : undefined;
    if (it.source === 'starter' && it.house_id !== myHouse.data?.house) return toast(t('errors.item_house_locked'));
    if (it.source === 'earned' && !mine.has(it.key)) return toast(t('shop.locked'));
    set({ [KIND_FIELD[it.kind]]: it.key.split(':')[1] } as Partial<Draft>);
  };
  const active = (it: CornerItem) => !!KIND_FIELD[it.kind] && d[KIND_FIELD[it.kind]] === it.key.split(':')[1];
  const preview = (it: CornerItem) => {
    const v = it.key.split(':')[1];
    if (it.kind === 'theme') return <View style={{ height: 92, borderRadius: radius.tile, overflow: 'hidden' }}><ThemeFill theme={v} /></View>;
    if (it.kind === 'frame') return <View style={{ height: 92, borderRadius: radius.tile, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>{FRAMES[v] ? <FramedAvatar frame={v} uri={profile.data?.avatar_url} name={name} size={44} /> : null}</View>;
    if (it.kind === 'name') return <View style={{ height: 92, borderRadius: radius.tile, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>{NAME_STYLES[v] ? <StyledName name={name.split(' ')[0]} style={v} size={17} /> : null}</View>;
    if (it.kind === 'pack') {
      const pk = PACKS[v] ?? PACKS.none;
      return <View style={{ height: 92, borderRadius: radius.tile, backgroundColor: colors.surface2, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4 }}>{pk.icons.slice(0, 8).map((I, i) => <I key={i} size={18} weight="fill" color={pk.color} />)}</View>;
    }
    const h = it.house_id as HouseId | null;
    if (it.kind === 'badge' && h) return <View style={{ height: 92, borderRadius: radius.tile, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}><HouseBadge house={h} size={26} named /></View>;
    if (it.kind === 'icon' && h) return <View style={{ height: 92, borderRadius: radius.tile, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 60, height: 60, borderRadius: 14, backgroundColor: houseTokens[h].primary, alignItems: 'center', justifyContent: 'center' }}><Sigil house={h} size={34} color={houseTokens[h].onPrimary} label={false} /></View></View>;
    if (it.kind === 'card' && h) return <View style={{ height: 92, borderRadius: radius.tile, backgroundColor: houseTokens[h].primary, alignItems: 'center', justifyContent: 'center' }}><Sigil house={h} size={30} color={houseTokens[h].onPrimary} label={false} /><Text variant="micro" color={houseTokens[h].onPrimary}>WRAPPED</Text></View>;
    return <View style={{ height: 92, borderRadius: radius.tile, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', opacity: mine.has(it.key) ? 1 : 0.45 }}><ReaderMarks keys={[it.key]} size={34} /></View>;
  };
  const myH = myHouse.data?.house ?? null;
  const starter = items.filter((i) => i.source === 'starter' && i.house_id === myH);
  const earned = items.filter((i) => i.source === 'earned');
  const collection = items.filter((i) => i.source === 'paid').sort((a, b) => Number(b.house_id === myH) - Number(a.house_id === myH));
  const name = profile.data?.display_name ?? profile.data?.username ?? 'You';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Press onPress={() => router.back()} style={{ height: 40, justifyContent: 'center', paddingHorizontal: spacing.sm }}>
          <Text tone="muted" style={{ fontFamily: fonts.medium }}>
            Cancel
          </Text>
        </Press>
        <Text variant="bodyStrong">Your Corner</Text>
        <Press onPress={() => (cart.length ? setCartOpen(true) : save.mutate(undefined))} style={{ height: 40, justifyContent: 'center', paddingHorizontal: spacing.sm }}>
          <Text tone="accent" style={{ fontFamily: fonts.semibold }}>
            Save
          </Text>
        </Press>
      </View>

      <View style={{ marginHorizontal: spacing.base, height: 176, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', backgroundColor: colors.bg }}>
        <Banner look={d} height={110} />
        <View style={{ marginTop: -36, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, paddingHorizontal: spacing.base }}>
          <FramedAvatar frame={d.frame} uri={profile.data?.avatar_url} name={name} size={56} />
          <View style={{ paddingBottom: 2, flex: 1 }}>
            <StyledName name={name} style={d.name_style} size={18} />
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {d.status_text || 'What are you reading?'}
            </Text>
          </View>
        </View>
        <View style={{ marginTop: spacing.sm, paddingHorizontal: spacing.base }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 10 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <View key={i} style={{ width: 18, height: 10, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: colors.surface3 }} />
            ))}
          </View>
          <Plank shelf={d.shelf} theme={d.theme} height={8} />
        </View>
        {cart.length ? (
          <View style={{ position: 'absolute', right: 8, top: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 4 }}>
            <CrownSimpleIcon size={12} weight="fill" color="#fff" />
            <Text variant="micro" color="#fff">
              Preview
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.sm }}>
        {(
          [
            ...(myHouse.data?.house ? ([['house', t('shop.houseTab')]] as [Tab, string][]) : []),
            ['themes', 'Theme'],
            ['blocks', 'Blocks'],
            ['frames', 'Frame'],
            ['shelf', 'Shelf'],
            ['extras', 'Name and stickers'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <Press key={id} onPress={() => setTab(id)} style={{ height: 36, paddingHorizontal: 14, borderRadius: radius.full, justifyContent: 'center', backgroundColor: tab === id ? colors.ink : colors.surface2 }}>
            <Text variant="small" style={{ fontFamily: fonts.semibold }} color={tab === id ? colors.bg : colors.ink}>
              {label}
            </Text>
          </Press>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: insets.bottom + 120 }}>
        {tab === 'house' && myH ? (
          <View style={{ gap: spacing.xl }}>
            <View>
              <Text variant="h2" style={{ fontSize: 14 }}>{t('shop.starter')}</Text>
              <Text variant="caption" tone="muted" style={{ marginBottom: spacing.sm }}>{t('shop.starterHint', { member: t(`houses.${myH}.member`) })}</Text>
              <Grid>
                {starter.map((it) => (
                  <ShopTile key={it.key} item={it} owned active={active(it)} onPress={() => pick(it)}>
                    {preview(it)}
                  </ShopTile>
                ))}
              </Grid>
            </View>
            <View>
              <Text variant="h2" style={{ fontSize: 14 }}>{t('shop.earned')}</Text>
              <Text variant="caption" tone="muted" style={{ marginBottom: spacing.sm }}>{t('shop.earnedHint')}</Text>
              <Grid>
                {earned.map((it) => (
                  <ShopTile key={it.key} item={it} owned={mine.has(it.key)} active={false} onPress={() => pick(it)} status={mine.has(it.key) ? t('shop.owned') : t('shop.locked')}>
                    {preview(it)}
                  </ShopTile>
                ))}
              </Grid>
            </View>
            <View>
              <Text variant="h2" style={{ fontSize: 14 }}>{t('shop.collection')}</Text>
              <Text variant="caption" tone="muted" style={{ marginBottom: spacing.sm }}>{t('shop.collectionHint')}</Text>
              <Grid>
                {collection.map((it) => (
                  <ShopTile
                    key={it.key}
                    item={it}
                    owned={isOwned(it)}
                    active={active(it)}
                    onPress={() => pick(it)}
                    tag={it.house_id && it.house_id !== myH ? t('shop.otherHouse', { house: HOUSE_NAMES[it.house_id as HouseId] }) : undefined}
                  >
                    {preview(it)}
                  </ShopTile>
                ))}
              </Grid>
            </View>
          </View>
        ) : null}
        {tab === 'themes' ? (
          <Grid>
            {kindItems('theme').map((it) => (
              <ShopTile key={it.key} item={it} owned={isOwned(it)} active={active(it)} onPress={() => pick(it)} tag={THEMES[it.key.split(':')[1]]?.kind === 'linear' && (THEMES[it.key.split(':')[1]] as { animated?: boolean }).animated ? 'Animated' : undefined}>
                <View style={{ height: 92, borderRadius: radius.tile, overflow: 'hidden' }}>
                  <ThemeFill theme={it.key.split(':')[1]} />
                </View>
              </ShopTile>
            ))}
          </Grid>
        ) : null}
        {tab === 'frames' ? (
          <Grid>
            {kindItems('frame').map((it) => (
              <ShopTile key={it.key} item={it} owned={isOwned(it)} active={active(it)} onPress={() => pick(it)}>
                <View style={{ height: 92, borderRadius: radius.tile, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  {FRAMES[it.key.split(':')[1]] ? <FramedAvatar frame={it.key.split(':')[1]} uri={profile.data?.avatar_url} name={name} size={44} /> : null}
                </View>
              </ShopTile>
            ))}
          </Grid>
        ) : null}
        {tab === 'shelf' ? (
          <Grid>
            {kindItems('shelf').map((it) => (
              <ShopTile key={it.key} item={it} owned={isOwned(it)} active={active(it)} onPress={() => pick(it)}>
                <View style={{ height: 92, borderRadius: radius.tile, backgroundColor: colors.surface2, justifyContent: 'flex-end', paddingHorizontal: spacing.md, paddingBottom: spacing.base }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                    {[30, 38, 26, 34, 40, 28].map((h, i) => (
                      <View key={i} style={{ width: 12, height: h, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: ['#c94f2c', '#2f56d9', '#e8d9b5', '#2f5d46', '#7b3f6e', '#d9a93a'][i] }} />
                    ))}
                  </View>
                  {SHELVES[it.key.split(':')[1]] ? <Plank shelf={it.key.split(':')[1]} theme={d.theme} height={8} /> : null}
                </View>
              </ShopTile>
            ))}
          </Grid>
        ) : null}
        {tab === 'extras' ? (
          <View style={{ gap: spacing.lg }}>
            <View>
              <Text variant="small" tone="muted" style={{ fontFamily: fonts.semibold, marginBottom: spacing.sm }}>
                Name style
              </Text>
              <Grid>
                {kindItems('name').map((it) => (
                  <ShopTile key={it.key} item={it} owned={isOwned(it)} active={active(it)} onPress={() => pick(it)}>
                    <View style={{ height: 64, borderRadius: radius.tile, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                      {NAME_STYLES[it.key.split(':')[1]] ? <StyledName name={name.split(' ')[0]} style={it.key.split(':')[1]} size={17} /> : null}
                    </View>
                  </ShopTile>
                ))}
              </Grid>
            </View>
            <View>
              <Text variant="small" tone="muted" style={{ fontFamily: fonts.semibold, marginBottom: spacing.sm }}>
                Banner stickers
              </Text>
              <Grid>
                {kindItems('pack').map((it) => {
                  const p = PACKS[it.key.split(':')[1]] ?? PACKS.none;
                  return (
                    <ShopTile key={it.key} item={it} owned={isOwned(it)} active={active(it)} onPress={() => pick(it)}>
                      <View style={{ height: 64, borderRadius: radius.tile, backgroundColor: colors.surface2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {p.icons.length ? p.icons.map((I, i) => <I key={i} size={20} weight="fill" color={p.color} style={{ transform: [{ rotate: `${(i - 1.5) * 10}deg` }] }} />) : <XIcon size={20} color={colors.faint} />}
                      </View>
                    </ShopTile>
                  );
                })}
              </Grid>
            </View>
          </View>
        ) : null}
        {tab === 'blocks' ? (
          <View style={{ gap: spacing.base }}>
            <Field icon={<PencilSimpleIcon size={16} color={colors.muted} />} label="Status" value={d.status_text} onChange={(v) => set({ status_text: v })} placeholder="Reading on the balcony, with tea" />
            <Field icon={<MusicNotesIcon size={16} color={colors.muted} />} label="Listening to" value={d.song} onChange={(v) => set({ song: v })} placeholder="Artist · Track" />
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <Text variant="small" tone="muted" style={{ fontFamily: fonts.semibold }}>
                  In your Corner · use the arrows to reorder
                </Text>
                <Text variant="caption" tone="faint">
                  {d.widgets.length} of {ALL_WIDGETS.length}
                </Text>
              </View>
              <View style={{ gap: 6 }}>
                {d.widgets.map((w, i) => (
                  <Animated.View key={w} layout={LinearTransition} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.tile, backgroundColor: colors.surface, paddingVertical: spacing.sm, paddingLeft: spacing.md, paddingRight: spacing.sm }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="body" numberOfLines={1}>
                        {WIDGETS[w as Widget]?.name ?? w}
                      </Text>
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {WIDGETS[w as Widget]?.desc}
                      </Text>
                    </View>
                    <Press accessibilityLabel="Move up" disabled={i === 0} onPress={() => set({ widgets: swap(d.widgets, i, i - 1) })} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                      <CaretRightIcon size={16} weight="bold" color={colors.muted} style={{ transform: [{ rotate: '-90deg' }] }} />
                    </Press>
                    <Press accessibilityLabel="Move down" disabled={i === d.widgets.length - 1} onPress={() => set({ widgets: swap(d.widgets, i, i + 1) })} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                      <CaretRightIcon size={16} weight="bold" color={colors.muted} style={{ transform: [{ rotate: '90deg' }] }} />
                    </Press>
                    <Press onPress={() => set({ widgets: d.widgets.filter((x) => x !== w) })} style={{ borderRadius: radius.full, backgroundColor: colors.surface2, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text variant="micro" tone="muted">
                        Remove
                      </Text>
                    </Press>
                  </Animated.View>
                ))}
              </View>
            </View>
            {d.widgets.length < ALL_WIDGETS.length ? (
              <View>
                <Text variant="small" tone="muted" style={{ fontFamily: fonts.semibold, marginBottom: spacing.sm }}>
                  Available
                </Text>
                <View style={{ gap: 6 }}>
                  {ALL_WIDGETS.filter((w) => !d.widgets.includes(w)).map((w) => (
                    <Press key={w} onPress={() => set({ widgets: [...d.widgets, w] })} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.tile, backgroundColor: colors.surface, paddingHorizontal: spacing.base, paddingVertical: spacing.md }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="body">{WIDGETS[w].name}</Text>
                        <Text variant="caption" tone="muted">
                          {WIDGETS[w].desc}
                        </Text>
                      </View>
                      <View style={{ borderRadius: radius.full, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text variant="micro" tone="accent">
                          Add
                        </Text>
                      </View>
                    </Press>
                  ))}
                </View>
              </View>
            ) : null}
            <Text variant="caption" tone="faint" align="center">
              All blocks are free.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {cart.length && !cartOpen ? (
        <Animated.View entering={SlideInDown.springify().damping(20)} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg, paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: insets.bottom + 10 }}>
          <Btn size="lg" full icon={<CrownSimpleIcon size={18} weight="fill" color={colors.onAccent} />} onPress={() => setCartOpen(true)}>
            {`${cart.length === 1 ? cart[0].name : `${cart.length} items`} · ${money(total)}`}
          </Btn>
          <Text variant="caption" tone="muted" align="center" style={{ marginTop: spacing.sm }}>
            One-off purchase. Yours for good, no subscription.
          </Text>
        </Animated.View>
      ) : null}

      {cartOpen ? (
        <>
          <Animated.View entering={FadeIn} style={{ position: 'absolute', inset: 0, backgroundColor: colors.scrim }}>
            <Press onPress={() => setCartOpen(false)} style={{ flex: 1 }} accessibilityLabel="Close" />
          </Animated.View>
          <Animated.View entering={SlideInDown.springify().damping(20)} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.md }}>
            <Text variant="h1">Coming soon</Text>
            <Text variant="callout" tone="muted" style={{ marginTop: spacing.sm }}>
              Purchases are not switched on yet. Your free choices can be saved now; the premium items stay in the shop for later.
            </Text>
            <View style={{ marginTop: spacing.base, gap: spacing.sm }}>
              {cart.map((i) => (
                <View key={i.key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text>{i.name}</Text>
                  <Text tone="muted">{money(i.price_cents)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm }}>
                <Text variant="bodyStrong">Total</Text>
                <Text variant="bodyStrong">{money(total)}</Text>
              </View>
            </View>
            <Btn
              size="lg"
              variant="inverse"
              full
              style={{ marginTop: spacing.lg }}
              loading={save.isPending}
              onPress={() => {
                const next = keepOwnedOnly();
                setDraft(next);
                setCartOpen(false);
                save.mutate(next);
              }}
            >
              Save the free choices
            </Btn>
            <Btn size="lg" variant="ghost" full style={{ marginTop: spacing.sm }} onPress={() => setCartOpen(false)}>
              Keep browsing
            </Btn>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

function swap<T>(arr: T[], a: number, b: number) {
  if (b < 0 || b >= arr.length) return arr;
  const next = [...arr];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

function Grid({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{children}</View>;
}

function ShopTile({ item, owned, active, onPress, tag, status, children }: { item: CornerItem; owned: boolean; active: boolean; onPress: () => void; tag?: string; status?: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Press onPress={onPress} accessibilityState={{ selected: active }} accessibilityLabel={`${item.name}${item.price_cents && !owned ? `, ${money(item.price_cents)}` : ''}`} style={{ width: '31.5%' }}>
      <View style={{ borderRadius: 16, padding: 4, borderWidth: 2, borderColor: active ? colors.accent : 'transparent' }}>{children}</View>
      {tag ? (
        <View style={{ position: 'absolute', left: 10, top: 10, borderRadius: radius.full, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text variant="micro" color="#fff" style={{ fontSize: 10 }}>
            {tag}
          </Text>
        </View>
      ) : null}
      {active ? (
        <View style={{ position: 'absolute', right: 10, top: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <CheckIcon size={11} weight="bold" color={colors.onAccent} />
        </View>
      ) : null}
      <Text variant="caption" style={{ fontFamily: fonts.medium, marginTop: 4, paddingHorizontal: 4 }} numberOfLines={1}>
        {item.name}
      </Text>
      <Text variant="micro" tone={item.price_cents && !owned ? 'accent' : 'muted'} style={{ paddingHorizontal: 4 }}>
        {status ?? (!item.price_cents ? 'Free' : owned ? 'Owned' : money(item.price_cents))}
      </Text>
    </Press>
  );
}

function Field({ icon, label, value, onChange, placeholder }: { icon: ReactNode; label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const { colors } = useTheme();
  return (
    <View>
      <Text variant="small" tone="muted" style={{ fontFamily: fonts.semibold }}>
        {label}
      </Text>
      <View style={{ marginTop: 6, height: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.tile, backgroundColor: colors.surface, paddingHorizontal: spacing.base }}>
        {icon}
        <TextInput value={value} maxLength={80} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.faint} style={{ flex: 1, color: colors.ink, fontFamily: fonts.regular, fontSize: 15 }} />
      </View>
    </View>
  );
}
