import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeInRight, FadeOutLeft, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BookOpenIcon,
  BooksIcon,
  CaretLeftIcon,
  CheckIcon,
  CoffeeIcon,
  CouchIcon,
  FeatherIcon,
  GlobeHemisphereWestIcon,
  ImageIcon,
  LightningIcon,
  MinusIcon,
  MoonStarsIcon,
  PlusIcon,
  QuotesIcon,
  ShuffleIcon,
  SparkleIcon,
  StackIcon,
  SunHorizonIcon,
  TrophyIcon,
  UsersThreeIcon,
  type IconProps,
} from '@/components/icons';
import { ImportPanel } from '@/components/import-panel';
import { Avatar, Btn, Cover, IconBtn, Press, Text } from '@/components/ui';
import { useGenres } from '@/hooks/queries';
import { getSuggestions, type BookSummary } from '@/services/catalogue';
import { suggestedCommunities, type Community } from '@/services/communities';
import { suggestReaders, type ReaderCard } from '@/services/profile';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { ARCHETYPES, QUESTIONS, scoreArchetype, type Arch } from '@/utils/archetypes';

const ICONS: Record<string, ComponentType<IconProps>> = {
  sunrise: SunHorizonIcon,
  coffee: CoffeeIcon,
  couch: CouchIcon,
  moon: MoonStarsIcon,
  feather: FeatherIcon,
  book: BookOpenIcon,
  books: BooksIcon,
  shuffle: ShuffleIcon,
  people: UsersThreeIcon,
  globe: GlobeHemisphereWestIcon,
  lightning: LightningIcon,
  quotes: QuotesIcon,
  trophy: TrophyIcon,
  image: ImageIcon,
  stack: StackIcon,
};
export const ARCH_ICONS: Record<Arch, ComponentType<IconProps>> = { night: MoonStarsIcon, saga: GlobeHemisphereWestIcon, quotes: QuotesIcon, archive: TrophyIcon, sprint: LightningIcon };

export type OnboardingResult = {
  archetype: Arch;
  genreIds: number[];
  favourites: BookSummary[];
  goal: number | null;
  follow: string[];
  join: string[];
};

type Step = 'genres' | 'q0' | 'q1' | 'q2' | 'q3' | 'favs' | 'goal' | 'import' | 'calc' | 'reveal' | 'follow';

export function OnboardingFlow({ quizOnly = false, onExit, onFinish, userId }: { quizOnly?: boolean; onExit?: () => void; onFinish: (r: OnboardingResult) => Promise<void> | void; userId: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const steps: Step[] = useMemo(
    () => (quizOnly ? ['genres', 'q0', 'q1', 'q2', 'q3', 'calc', 'reveal'] : ['genres', 'q0', 'q1', 'q2', 'q3', 'favs', 'goal', 'import', 'calc', 'reveal', 'follow']),
    [quizOnly],
  );
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [favs, setFavs] = useState<BookSummary[]>([]);
  const [goal, setGoal] = useState(24);
  const [follow, setFollow] = useState<Set<string>>(new Set());
  const [join, setJoin] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const genres = useGenres();
  const step = steps[i];
  const go = (d: 1 | -1) => setI((x) => Math.max(0, Math.min(steps.length - 1, x + d)));
  const slugs = (genres.data ?? []).filter((g) => picked.includes(g.id)).map((g) => g.slug);
  const result = scoreArchetype(answers, slugs);

  const finish = async () => {
    setSaving(true);
    try {
      await onFinish({ archetype: result, genreIds: picked, favourites: favs, goal: quizOnly ? null : goal, follow: [...follow], join: [...join] });
    } finally {
      setSaving(false);
    }
  };

  const counted: Step[] = steps.filter((s) => s !== 'calc' && s !== 'reveal');
  const pos = counted.indexOf(step);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {step !== 'calc' ? (
        <View style={{ position: 'absolute', top: insets.top + 4, left: 0, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md }}>
          <IconBtn label="Back" onPress={() => (i === 0 ? onExit?.() : go(-1))} style={{ opacity: i === 0 && !onExit ? 0 : 1 }}>
            <CaretLeftIcon size={22} weight="bold" color={colors.ink} />
          </IconBtn>
          <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
            {counted.map((s, k) => (
              <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: k <= pos || step === 'reveal' ? colors.accent : colors.surface3 }} />
            ))}
          </View>
          <View style={{ width: 40 }} />
        </View>
      ) : null}

      <Animated.View key={step} entering={FadeInRight.duration(320).reduceMotion(ReduceMotion.System)} exiting={FadeOutLeft.duration(160)} style={{ flex: 1 }}>
        {step === 'genres' && (
          <Frame title="What do you like to read?" sub="Pick at least three." cta={picked.length < 3 ? `Pick ${3 - picked.length} more` : 'Continue'} disabled={picked.length < 3} onNext={() => go(1)}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {(genres.data ?? []).map((g) => {
                const on = picked.includes(g.id);
                return (
                  <Press
                    key={g.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    onPress={() => setPicked((p) => (on ? p.filter((x) => x !== g.id) : [...p, g.id]))}
                    style={{ height: 40, paddingHorizontal: spacing.base, borderRadius: radius.full, borderWidth: 1, borderColor: on ? colors.accent : colors.lineStrong, backgroundColor: on ? colors.accent : 'transparent', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  >
                    {on ? <CheckIcon size={14} weight="bold" color={colors.onAccent} /> : null}
                    <Text variant="callout" style={{ fontFamily: fonts.medium }} tone={on ? 'onAccent' : 'ink'}>
                      {g.name}
                    </Text>
                  </Press>
                );
              })}
            </View>
          </Frame>
        )}

        {step.startsWith('q') && <Question n={Number(step.slice(1))} value={answers[QUESTIONS[Number(step.slice(1))].id]} onPick={(id) => { setAnswers((a) => ({ ...a, [QUESTIONS[Number(step.slice(1))].id]: id })); setTimeout(() => go(1), 260); }} />}

        {step === 'favs' && <Favourites genreIds={picked} favs={favs} setFavs={setFavs} onNext={() => go(1)} />}

        {step === 'goal' && (
          <Frame title="How many books this year?" sub="A goal helps. You can change it any time." cta={`Set a goal of ${goal}`} onNext={() => go(1)}>
            <View style={{ marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <IconBtn label="One less" size={56} filled onPress={() => setGoal(Math.max(1, goal - 1))}>
                <MinusIcon size={22} weight="bold" color={colors.ink} />
              </IconBtn>
              <Text style={{ fontFamily: fonts.bold, fontSize: 96, lineHeight: 100, fontVariant: ['tabular-nums'] }}>{goal}</Text>
              <IconBtn label="One more" size={56} filled onPress={() => setGoal(Math.min(1000, goal + 1))}>
                <PlusIcon size={22} weight="bold" color={colors.ink} />
              </IconBtn>
            </View>
            <Text variant="callout" tone="muted" align="center" style={{ marginTop: spacing.base }}>
              About {goal >= 12 ? `${Math.round(goal / 12)} a month` : `one every ${Math.round(12 / goal)} months`}, or {Math.round((goal * 330) / 365)} pages a day.
            </Text>
            <View style={{ marginTop: spacing.xxl, flexDirection: 'row', justifyContent: 'center', gap: spacing.sm }}>
              {[12, 24, 52, 100].map((n) => (
                <Press key={n} onPress={() => setGoal(n)} style={{ height: 36, paddingHorizontal: spacing.base, borderRadius: radius.full, backgroundColor: goal === n ? colors.ink : colors.surface2, justifyContent: 'center' }}>
                  <Text variant="callout" style={{ fontFamily: fonts.semibold }} color={goal === n ? colors.bg : colors.ink}>
                    {n}
                  </Text>
                </Press>
              ))}
            </View>
          </Frame>
        )}

        {step === 'import' && (
          <Frame title="Bring the books you already have" sub="The more Grimore knows, the better its suggestions. You can also photograph your shelf later from the + button." cta="I’ll do this later" ctaVariant="secondary" onNext={() => go(1)}>
            <ImportPanel onDone={() => go(1)} />
          </Frame>
        )}

        {step === 'calc' && <Calc onDone={() => go(1)} />}
        {step === 'reveal' && <Reveal arch={result} genres={(genres.data ?? []).filter((g) => picked.includes(g.id)).map((g) => g.name)} cta={quizOnly ? 'See my profile' : 'Continue'} busy={saving} onNext={quizOnly ? finish : () => go(1)} />}
        {step === 'follow' && <Follow arch={result} userId={userId} follow={follow} setFollow={setFollow} join={join} setJoin={setJoin} busy={saving} onDone={finish} />}
      </Animated.View>
    </View>
  );
}

function Frame({ title, sub, children, cta, onNext, disabled, ctaVariant = 'primary', busy }: { title: string; sub?: string; children: ReactNode; cta: string; onNext: () => void; disabled?: boolean; ctaVariant?: 'primary' | 'secondary'; busy?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: insets.top + 60, paddingBottom: insets.bottom + spacing.md }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 32, lineHeight: 34 }}>
          {title}
        </Text>
        {sub ? (
          <Text variant="body" tone="muted" style={{ marginTop: spacing.sm }}>
            {sub}
          </Text>
        ) : null}
        <View style={{ marginTop: spacing.xl }}>{children}</View>
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <Btn size="lg" full variant={ctaVariant} disabled={disabled} loading={busy} onPress={onNext}>
          {cta}
        </Btn>
      </View>
    </View>
  );
}

function Question({ n, value, onPick }: { n: number; value?: string; onPick: (id: string) => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const q = QUESTIONS[n];
  return (
    <View style={{ flex: 1, paddingHorizontal: spacing.xl, paddingTop: insets.top + 60, paddingBottom: insets.bottom + spacing.xl }}>
      <Text variant="small" tone="accent" style={{ fontFamily: fonts.semibold }}>
        Question {n + 1} of {QUESTIONS.length}
      </Text>
      <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 32, lineHeight: 34, marginTop: spacing.sm }}>
        {q.title}
      </Text>
      <View style={{ marginTop: 'auto', gap: 10 }}>
        {q.options.map((o, k) => {
          const on = value === o.id;
          const Icon = ICONS[o.icon] ?? BookOpenIcon;
          return (
            <Animated.View key={o.id} entering={FadeInDown.duration(350).delay(80 + k * 50).reduceMotion(ReduceMotion.System)}>
              <Press
                onPress={() => onPick(o.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base, borderRadius: radius.card, borderWidth: 2, borderColor: on ? colors.accent : 'transparent', backgroundColor: on ? colors.accentSoft : colors.surface, padding: spacing.base }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.accent : colors.surface2 }}>
                  <Icon size={22} weight={on ? 'fill' : 'regular'} color={on ? colors.onAccent : colors.ink} />
                </View>
                <View>
                  <Text variant="bodyStrong" style={{ fontSize: 16 }}>
                    {o.label}
                  </Text>
                  {o.sub ? (
                    <Text variant="small" tone="muted">
                      {o.sub}
                    </Text>
                  ) : null}
                </View>
              </Press>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

function Favourites({ genreIds, favs, setFavs, onNext }: { genreIds: number[]; favs: BookSummary[]; setFavs: (f: BookSummary[]) => void; onNext: () => void }) {
  const { colors } = useTheme();
  const books = useQuery({ queryKey: ['onboarding-picks', genreIds], queryFn: async () => {
    const mine = await getSuggestions(genreIds, [], 16);
    return mine.length >= 12 ? mine : [...mine, ...(await getSuggestions([], mine.map((b) => b.id), 16 - mine.length))];
  } });
  const cta = favs.length === 4 ? 'Continue' : favs.length ? `${4 - favs.length} to go` : 'Skip';
  const cell = { flexBasis: '22%', flexGrow: 1 } as const;
  return (
    <Frame title="Your four favourites" sub="They go to the top of your Corner. You can change them any time." cta={cta} disabled={favs.length > 0 && favs.length < 4} onNext={onNext}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
        {[0, 1, 2, 3].map((k) => (
          <View key={k} style={[cell, { aspectRatio: 2 / 3, borderRadius: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}>
            {favs[k] ? (
              <Press onPress={() => setFavs(favs.filter((f) => f.id !== favs[k].id))} accessibilityLabel={`Remove ${favs[k].title}`} style={{ width: '100%', height: '100%' }}>
                <Animated.View entering={FadeIn}>
                  <Cover uri={favs[k].cover_url} title={favs[k].title} author={favs[k].authors} width={74} shadow={false} style={{ width: '100%', height: '100%' }} />
                </Animated.View>
              </Press>
            ) : (
              <Text variant="small" tone="faint">
                {k + 1}
              </Text>
            )}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {(books.data ?? [])
          .filter((b) => !favs.some((f) => f.id === b.id))
          .map((b) => (
            <Press key={b.id} onPress={() => favs.length < 4 && setFavs([...favs, b])} accessibilityLabel={`Pick ${b.title}`} style={[cell, { maxWidth: '24%' }]}>
              <Cover uri={b.cover_url} title={b.title} author={b.authors} width={74} style={{ width: '100%', height: undefined, aspectRatio: 2 / 3 }} />
            </Press>
          ))}
      </View>
    </Frame>
  );
}

function Calc({ onDone }: { onDone: () => void }) {
  const lines = ['Reading your answers', 'Comparing with other readers', 'Choosing communities'];
  const [k, setK] = useState(0);
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 1200, easing: Easing.linear, reduceMotion: ReduceMotion.System }), -1);
    const t = setInterval(() => setK((x) => Math.min(2, x + 1)), 650);
    const d = setTimeout(onDone, 2100);
    return () => {
      clearInterval(t);
      clearTimeout(d);
    };
  }, [onDone, spin]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl }}>
      <Animated.View style={style}>
        <SparkleIcon size={40} weight="fill" color={colors.accent} />
      </Animated.View>
      <Animated.View key={k} entering={FadeInDown.duration(300)} style={{ marginTop: spacing.xl }}>
        <Text variant="title" tone="muted">
          {lines[k]}
        </Text>
      </Animated.View>
    </View>
  );
}

function Glow({ color, size, style }: { color: string; size: number; style: object }) {
  return <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0.35 }, style]} />;
}

function Reveal({ arch, genres, cta, onNext, busy }: { arch: Arch; genres: string[]; cta: string; onNext: () => void; busy?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const a = ARCHETYPES[arch];
  const Icon = ARCH_ICONS[arch];
  return (
    <View style={{ flex: 1, overflow: 'hidden', paddingHorizontal: spacing.xl, paddingTop: insets.top + 72, paddingBottom: insets.bottom + spacing.md }}>
      <Glow color={colors.accent} size={300} style={{ right: -90, top: 20 }} />
      <Glow color="#2f56d9" size={240} style={{ left: -70, top: 260, opacity: 0.22 }} />
      <Animated.View entering={FadeIn.springify().damping(12)} style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={40} weight="fill" color={colors.onAccent} />
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(600).delay(250).reduceMotion(ReduceMotion.System)}>
        <Text variant="body" tone="muted" style={{ marginTop: spacing.xxl }}>
          Your reader profile
        </Text>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 42, lineHeight: 44, marginTop: 4 }}>
          {a.name}
        </Text>
        <Text variant="body" style={{ fontSize: 17, lineHeight: 26, marginTop: spacing.base, opacity: 0.85 }}>
          {a.line}
        </Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(600).delay(450).reduceMotion(ReduceMotion.System)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xl }}>
        {genres.slice(0, 4).map((g) => (
          <View key={g} style={{ borderRadius: radius.full, borderWidth: 1, borderColor: colors.lineStrong, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text variant="small">{g}</Text>
          </View>
        ))}
      </Animated.View>
      <View style={{ marginTop: 'auto' }}>
        <Btn size="lg" full loading={busy} onPress={onNext}>
          {cta}
        </Btn>
      </View>
    </View>
  );
}

function Follow({
  arch,
  userId,
  follow,
  setFollow,
  join,
  setJoin,
  onDone,
  busy,
}: {
  arch: Arch;
  userId: string;
  follow: Set<string>;
  setFollow: (s: Set<string>) => void;
  join: Set<string>;
  setJoin: (s: Set<string>) => void;
  onDone: () => void;
  busy: boolean;
}) {
  const { colors } = useTheme();
  const readers = useQuery({ queryKey: ['onboarding-readers', arch], queryFn: () => suggestReaders(userId, arch, 6) });
  const comms = useQuery({ queryKey: ['onboarding-communities'], queryFn: () => suggestedCommunities(4) });
  const toggle = (s: Set<string>, id: string) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  };
  return (
    <Frame title="Start in good company" sub={`Picked with ${ARCHETYPES[arch].name.toLowerCase()}s in mind.`} cta="Enter Grimore" busy={busy} onNext={onDone}>
      {(comms.data ?? []).length ? (
        <>
          <Text variant="small" tone="muted" style={{ fontFamily: fonts.semibold }}>
            Communities
          </Text>
          <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
            {(comms.data ?? []).map((c: Community) => {
              const on = join.has(c.id);
              return (
                <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {c.member_count} members · {c.price_cents ? 'Membership tiers' : 'Free'}
                    </Text>
                  </View>
                  <Btn size="sm" variant={on ? 'secondary' : 'inverse'} icon={on ? <CheckIcon size={13} weight="bold" color={colors.ink} /> : undefined} onPress={() => setJoin(toggle(join, c.id))}>
                    {on ? 'Joined' : 'Join'}
                  </Btn>
                </View>
              );
            })}
          </View>
        </>
      ) : null}
      <Text variant="small" tone="muted" style={{ fontFamily: fonts.semibold, marginTop: spacing.xl }}>
        Readers like you
      </Text>
      <View style={{ marginTop: spacing.sm, gap: 4 }}>
        {(readers.data ?? []).length === 0 ? (
          <Text variant="callout" tone="muted">
            You are one of the first readers here. Invite a friend from your profile once you are in.
          </Text>
        ) : (
          (readers.data ?? []).map((u: ReaderCard) => {
            const on = follow.has(u.id);
            return (
              <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6 }}>
                <Avatar uri={u.avatar_url} name={u.display_name ?? u.username} size={44} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {u.display_name ?? u.username}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {u.archetype ? ARCHETYPES[u.archetype as Arch]?.name : `@${u.username}`}
                  </Text>
                </View>
                <Btn size="sm" variant={on ? 'secondary' : 'primary'} onPress={() => setFollow(toggle(follow, u.id))}>
                  {on ? 'Following' : 'Follow'}
                </Btn>
              </View>
            );
          })
        )}
      </View>
    </Frame>
  );
}
