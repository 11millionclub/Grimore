import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { Sigil } from '@/components/sigil';
import { Press, Text, toast } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { track } from '@/lib/analytics';
import { toAppError } from '@/lib/errors';
import { changeHouse, houseBalance, submitSorting } from '@/services/houses';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { HOUSE_IDS, HOUSE_NAMES, houseTokens, type HouseId } from '@/theme/houses';
import { decide, shuffle, SORTING_QUESTIONS, suggestedTieBreak, type Answers, type Scores } from '@/utils/sorting';

import { Frame, OptionRow, StepHeader } from './frame';
import { Reveal } from './reveal';

type Phase = { k: 'intro' } | { k: 'q'; i: number } | { k: 'tie'; tied: HouseId[] } | { k: 'torn'; top: [HouseId, HouseId] } | { k: 'choose'; change?: boolean } | { k: 'reveal'; house: HouseId; scores: Scores | null };

/**
 * The Sorting: intro, eight scenario questions (answers shuffled, no House
 * names or colours), then a tie-breaker or a "torn between two" choice when
 * needed, and the reveal. The server re-scores the answers and assigns the House.
 */
export function SortingFlow({ onDone, onBack, stepOffset = 0, stepTotal = 9 }: { onDone: (house: HouseId) => void; onBack?: () => void; stepOffset?: number; stepTotal?: number }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>({ k: 'intro' });
  const [answers, setAnswers] = useState<Answers>({});
  const [busy, setBusy] = useState(false);
  const order = useMemo(() => Object.fromEntries(SORTING_QUESTIONS.map((q) => [q, shuffle(HOUSE_IDS)])) as Record<(typeof SORTING_QUESTIONS)[number], HouseId[]>, []);

  const submit = async (input: { answers: Answers; tieBreak?: HouseId; choice?: HouseId }, meta: { gap?: number; tie?: boolean; skipped?: boolean }) => {
    setBusy(true);
    try {
      const r = await submitSorting(input);
      track('house_revealed', { house: r.house, gap: meta.gap ?? null, tie_break: !!meta.tie, skipped: !!meta.skipped });
      setPhase({ k: 'reveal', house: r.house, scores: meta.skipped ? null : r.scores });
    } catch (e) {
      toast(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const finishQuestions = (a: Answers) => {
    const d = decide(a);
    if (d.kind === 'tie') return setPhase({ k: 'tie', tied: shuffle(d.tied) });
    if (d.kind === 'torn') return setPhase({ k: 'torn', top: d.top });
    void submit({ answers: a }, { gap: d.scores[d.house] - Math.max(...HOUSE_IDS.filter((h) => h !== d.house).map((h) => d.scores[h])) });
  };

  const back = () => {
    if (phase.k === 'q') return setPhase(phase.i === 0 ? { k: 'intro' } : { k: 'q', i: phase.i - 1 });
    if (phase.k === 'tie' || phase.k === 'torn') return setPhase({ k: 'q', i: 7 });
    if (phase.k === 'choose' && !phase.change) return setPhase({ k: 'intro' });
    onBack?.();
  };

  if (phase.k === 'reveal')
    return (
      <Reveal
        house={phase.house}
        scores={phase.scores}
        onContinue={() => onDone(phase.house)}
        onChooseAnother={() => setPhase({ k: 'choose', change: true })}
      />
    );

  const progress = phase.k === 'q' ? stepOffset + 1 + phase.i / 8 : phase.k === 'intro' ? stepOffset : stepOffset + 1;
  return (
    <View style={{ flex: 1 }}>
      <StepHeader step={Math.min(stepTotal, progress)} total={stepTotal} onBack={phase.k === 'intro' && !onBack ? undefined : back} />
      {busy ? (
        <View style={{ ...{ position: 'absolute', inset: 0 }, zIndex: 20, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
          <Text variant="small" tone="muted" style={{ marginTop: spacing.sm }}>
            {t('sorting.reveal.saving')}
          </Text>
        </View>
      ) : null}
      <View style={{ flex: 1, opacity: busy ? 0.15 : 1 }} pointerEvents={busy ? 'none' : 'auto'}>
        {phase.k === 'intro' ? (
          <Intro
            onBegin={() => {
              track('sorting_started');
              setPhase({ k: 'q', i: 0 });
            }}
            onChoose={() => {
              track('sorting_skipped');
              setPhase({ k: 'choose' });
            }}
          />
        ) : null}
        {phase.k === 'q' ? (
          <Question
            key={phase.i}
            n={phase.i}
            order={order[SORTING_QUESTIONS[phase.i]]}
            value={answers[SORTING_QUESTIONS[phase.i]]}
            onPick={(h) => {
              const q = SORTING_QUESTIONS[phase.i];
              const next = { ...answers, [q]: h };
              setAnswers(next);
              track('sorting_question_answered', { question: q, house: h });
              setTimeout(() => (phase.i < 7 ? setPhase({ k: 'q', i: phase.i + 1 }) : finishQuestions(next)), 220);
            }}
          />
        ) : null}
        {phase.k === 'tie' ? <TieBreak tied={phase.tied} onPick={(h) => void submit({ answers, tieBreak: h }, { tie: true, gap: 0 })} /> : null}
        {phase.k === 'torn' ? (
          <Torn
            top={phase.top}
            onPick={(h) => {
              track('house_chosen_from_two', { house: h });
              void submit({ answers, choice: h }, { gap: 2 });
            }}
          />
        ) : null}
        {phase.k === 'choose' ? (
          <ChooseHouse
            onPick={async (h) => {
              if (!phase.change) return void submit({ answers: {}, choice: h }, { skipped: true });
              setBusy(true);
              try {
                await changeHouse(h);
                track('house_changed', { to: h, when: 'reveal' });
                setPhase({ k: 'reveal', house: h, scores: null });
              } catch (e) {
                toast(toAppError(e).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

function Intro({ onBegin, onChoose }: { onBegin: () => void; onChoose: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Frame
      title={t('sorting.intro.title')}
      sub={t('sorting.intro.sub')}
      cta={t('sorting.intro.begin')}
      onNext={onBegin}
      footer={
        <Press onPress={onChoose} accessibilityRole="button" style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md }}>
          <Text variant="small" tone="muted" style={{ textDecorationLine: 'underline' }}>
            {t('sorting.intro.choose')}
          </Text>
        </Press>
      }
    >
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.xl }}>
        {HOUSE_IDS.map((h, i) => (
          <Animated.View key={h} entering={FadeInDown.delay(120 * i).duration(500).reduceMotion(ReduceMotion.System)}>
            <Sigil house={h} size={44} color={colors.muted} label={false} />
          </Animated.View>
        ))}
      </View>
    </Frame>
  );
}

function Question({ n, order, value, onPick }: { n: number; order: HouseId[]; value?: HouseId; onPick: (h: HouseId) => void }) {
  const { t } = useTranslation();
  const q = SORTING_QUESTIONS[n];
  return (
    <Frame title={t(`sorting.${q}.title`)} sub={t('sorting.question', { n: n + 1, total: 8 })}>
      <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
        {order.map((h, k) => (
          <Animated.View key={h} entering={FadeInDown.duration(320).delay(60 + k * 50).reduceMotion(ReduceMotion.System)}>
            <OptionRow label={t(`sorting.${q}.${h}`)} on={value === h} onPress={() => onPick(h)} />
          </Animated.View>
        ))}
      </View>
    </Frame>
  );
}

/** Unnamed, uncoloured signs in random order. Soft balance may pre-highlight one, never forces it. */
function TieBreak({ tied, onPick }: { tied: HouseId[]; onPick: (h: HouseId) => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const balance = useQuery({ queryKey: ['houseBalance'], queryFn: houseBalance, staleTime: 10 * 60_000 });
  const hint = balance.data ? suggestedTieBreak(tied, balance.data) : null;
  return (
    <Frame title={t('sorting.tie.title')} sub={t('sorting.tie.sub')}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' }}>
        {tied.map((h, i) => (
          <Press
            key={h}
            accessibilityRole="button"
            accessibilityLabel={t('sorting.tie.sign', { n: i + 1 })}
            onPress={() => onPick(h)}
            style={{ width: 132, height: 132, borderRadius: radius.card, borderWidth: hint === h ? 2 : 1, borderColor: hint === h ? colors.gold : colors.line, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
          >
            <Sigil house={h} size={64} color={colors.ink} label={false} />
          </Press>
        ))}
      </View>
    </Frame>
  );
}

function Torn({ top, onPick }: { top: [HouseId, HouseId]; onPick: (h: HouseId) => void }) {
  const { t } = useTranslation();
  return (
    <Frame title={t('sorting.torn.title')} sub={t('sorting.torn.sub')}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xl, marginVertical: spacing.xl }}>
        <Animated.View entering={FadeIn.duration(500).reduceMotion(ReduceMotion.System)} style={{ transform: [{ scaleX: 1 }] }}>
          <Sigil house={top[0]} size={84} color={houseTokens[top[0]].ink} />
        </Animated.View>
        <Animated.View entering={FadeIn.duration(500).delay(150).reduceMotion(ReduceMotion.System)} style={{ transform: [{ scaleX: -1 }] }}>
          <Sigil house={top[1]} size={84} color={houseTokens[top[1]].ink} />
        </Animated.View>
      </View>
      <View style={{ gap: spacing.md }}>
        {top.map((h) => (
          <HouseButton key={h} house={h} onPress={() => onPick(h)} />
        ))}
      </View>
    </Frame>
  );
}

function HouseButton({ house, onPress }: { house: HouseId; onPress: () => void }) {
  const { t } = useTranslation();
  const tk = houseTokens[house];
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={t('sorting.torn.pick', { house: HOUSE_NAMES[house] })}
      onPress={onPress}
      style={{ minHeight: 64, borderRadius: radius.card, backgroundColor: tk.primary, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base }}
    >
      <Sigil house={house} size={30} color={tk.onPrimary} label={false} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 18 }} color={tk.onPrimary}>
          {HOUSE_NAMES[house]}
        </Text>
        <Text variant="small" color={tk.onPrimary}>
          {t(`houses.${house}.motto`)}
        </Text>
      </View>
    </Press>
  );
}

function ChooseHouse({ onPick }: { onPick: (h: HouseId) => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [sel, setSel] = useState<HouseId | null>(null);
  return (
    <Frame title={t('sorting.choose.title')} sub={t('sorting.choose.sub')} cta={sel ? t('sorting.choose.join', { house: HOUSE_NAMES[sel] }) : undefined} onNext={() => sel && onPick(sel)}>
      <View style={{ gap: spacing.md }}>
        {HOUSE_IDS.map((h) => {
          const on = sel === h;
          const tk = houseTokens[h];
          return (
            <Press
              key={h}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setSel(h)}
              style={{ borderRadius: radius.card, borderWidth: on ? 2 : 1, borderColor: on ? tk.ink : colors.line, backgroundColor: colors.surface, padding: spacing.base, flexDirection: 'row', gap: spacing.md }}
            >
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: tk.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Sigil house={h} size={30} color={tk.onPrimary} label={false} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 18 }} color={tk.ink}>
                  {HOUSE_NAMES[h]} · {t(`houses.${h}.members`)}
                </Text>
                <Text variant="small" style={{ fontStyle: 'italic' }}>
                  {t(`houses.${h}.motto`)}
                </Text>
                <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
                  {t(`houses.${h}.strength`)}
                </Text>
              </View>
            </Press>
          );
        })}
      </View>
    </Frame>
  );
}
