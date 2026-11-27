import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { CaretRightIcon } from '@/components/icons';
import { Sigil } from '@/components/sigil';
import { Press, Text, toast } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { track } from '@/lib/analytics';
import { confirmAction } from '@/lib/confirm';
import { toAppError } from '@/lib/errors';
import { submitSorting } from '@/services/houses';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { HOUSE_IDS, HOUSE_NAMES, type HouseId, houseInk, houseTokens, themedHouse } from '@/theme/houses';
import { breakdown, decide, shuffle, type Answers, type Scores } from '@/utils/sorting';
import { QUIZ, tieBreakerFor } from '@/utils/sorting-quiz';

import { Frame, OptionRow, StepHeader } from './frame';
import { Reveal } from './reveal';

type Phase =
  | { k: 'intro' }
  | { k: 'q'; i: number; editing?: boolean }
  | { k: 'review' }
  | { k: 'pair'; pair: [HouseId, HouseId] }
  | { k: 'multi'; tied: HouseId[]; scores: Scores }
  | { k: 'reveal'; house: HouseId; scores: Scores };

const TOTAL = QUIZ.length;

/**
 * The House Sorting Quiz (GRIMORE specification): an intro, twelve questions
 * one at a time (answers shuffled, no letters, Houses or points shown), a
 * review screen to change answers or start again, the pair tie-breaker when
 * exactly two Houses tie, a choice between the tied Houses when three or four
 * tie, and the reveal with all four percentages. The server re-scores
 * everything and assigns the House.
 */
export function SortingFlow({ onDone, onBack, stepOffset = 0, stepTotal = 2 }: { onDone: (house: HouseId) => void; onBack?: () => void; stepOffset?: number; stepTotal?: number }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>({ k: 'intro' });
  const [answers, setAnswers] = useState<Answers>({});
  const [busy, setBusy] = useState(false);
  // Options are shuffled once per session; text and score always move together.
  const order = useMemo(() => Object.fromEntries(QUIZ.map((q) => [q.id, shuffle(q.options.map((o) => o.id))])) as Record<string, string[]>, []);
  const [tbOrder] = useState(() => (Math.random() < 0.5 ? (['a', 'b'] as const) : (['b', 'a'] as const)));

  const submit = async (input: { tieBreak?: 'a' | 'b'; choice?: HouseId }) => {
    setBusy(true);
    try {
      const r = await submitSorting({ answers, tieBreak: input.tieBreak ?? null, choice: input.choice ?? null });
      track('house_revealed', { house: r.house, tie_break: !!input.tieBreak, multi: !!input.choice });
      setPhase({ k: 'reveal', house: r.house, scores: r.scores });
    } catch (e) {
      toast(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const reveal = () => {
    const d = decide(answers);
    if (d.kind === 'pair') return setPhase({ k: 'pair', pair: d.pair });
    if (d.kind === 'multi') return setPhase({ k: 'multi', tied: d.tied, scores: d.scores });
    void submit({});
  };

  const back = () => {
    if (phase.k === 'q') return setPhase(phase.editing ? { k: 'review' } : phase.i === 0 ? { k: 'intro' } : { k: 'q', i: phase.i - 1 });
    if (phase.k === 'review') return setPhase({ k: 'q', i: TOTAL - 1 });
    if (phase.k === 'pair' || phase.k === 'multi') return setPhase({ k: 'review' });
    onBack?.();
  };

  const restart = async () => {
    if (!(await confirmAction(t('sorting.review.restart'), t('sorting.review.restartConfirm'), t('sorting.review.restart'), false))) return;
    setAnswers({});
    setPhase({ k: 'q', i: 0 });
  };

  if (phase.k === 'reveal') return <Reveal house={phase.house} scores={phase.scores} onContinue={() => onDone(phase.house)} />;

  const answered = Object.keys(answers).length;
  const progress = phase.k === 'q' ? stepOffset + (phase.i + 1) / TOTAL : phase.k === 'intro' ? stepOffset : stepOffset + 1;
  return (
    <View style={{ flex: 1 }}>
      <StepHeader step={Math.min(stepTotal, progress)} total={stepTotal} onBack={phase.k === 'intro' && !onBack ? undefined : back} />
      {busy ? (
        <View style={{ position: 'absolute', inset: 0, zIndex: 20, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
          <Text variant="small" tone="muted" style={{ marginTop: spacing.sm }}>
            {t('sorting.reveal.saving')}
          </Text>
        </View>
      ) : null}
      <View style={{ flex: 1, opacity: busy ? 0.15 : 1 }} pointerEvents={busy ? 'none' : 'auto'}>
        {phase.k === 'intro' ? <Intro onBegin={() => (track('sorting_started'), setPhase(answered ? { k: 'review' } : { k: 'q', i: 0 }))} /> : null}
        {phase.k === 'q' ? (
          <Question
            key={phase.i}
            i={phase.i}
            order={order[QUIZ[phase.i].id]}
            value={answers[QUIZ[phase.i].id]}
            onPick={(id) => {
              const q = QUIZ[phase.i];
              setAnswers((a) => ({ ...a, [q.id]: id as 'a' | 'b' | 'c' | 'd' }));
              track('sorting_question_answered', { question: q.id });
              const go = () => setPhase(phase.editing || phase.i === TOTAL - 1 ? { k: 'review' } : { k: 'q', i: phase.i + 1 });
              setTimeout(go, 220);
            }}
            onNext={answers[QUIZ[phase.i].id] ? () => setPhase(phase.editing || phase.i === TOTAL - 1 ? { k: 'review' } : { k: 'q', i: phase.i + 1 }) : undefined}
          />
        ) : null}
        {phase.k === 'review' ? <Review answers={answers} onEdit={(i) => setPhase({ k: 'q', i, editing: true })} onReveal={reveal} onRestart={() => void restart()} /> : null}
        {phase.k === 'pair' ? <PairTieBreak pair={phase.pair} order={tbOrder} onPick={(id) => void submit({ tieBreak: id })} /> : null}
        {phase.k === 'multi' ? <MultiTie tied={phase.tied} scores={phase.scores} onPick={(h) => void submit({ choice: h })} /> : null}
      </View>
    </View>
  );
}

function Intro({ onBegin }: { onBegin: () => void }) {
  const { t } = useTranslation();
  return (
    <Frame title={t('sorting.intro.title')} sub={t('sorting.intro.sub')} cta={t('sorting.intro.begin')} onNext={onBegin}>
      {/* All four Houses, in full colour and equal size: none is presented as better. */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginTop: spacing.xl, flexWrap: 'wrap' }}>
        {HOUSE_IDS.map((h, i) => (
          <Animated.View key={h} entering={FadeInDown.delay(120 * i).duration(500).reduceMotion(ReduceMotion.System)} style={{ alignItems: 'center', gap: 6, width: 72 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: houseTokens[h].primary, alignItems: 'center', justifyContent: 'center' }}>
              <Sigil house={h} size={32} color={houseTokens[h].onPrimary} label={false} />
            </View>
            <Text variant="caption" align="center">
              {HOUSE_NAMES[h]}
            </Text>
          </Animated.View>
        ))}
      </View>
    </Frame>
  );
}

function Question({ i, order, value, onPick, onNext }: { i: number; order: string[]; value?: string; onPick: (id: string) => void; onNext?: () => void }) {
  const { t } = useTranslation();
  const q = QUIZ[i];
  return (
    <Frame title={q.title} sub={`${t('sorting.question', { n: i + 1, total: TOTAL })}\n\n${q.prompt}`} cta={onNext ? t('sorting.next') : undefined} onNext={onNext} ctaVariant="secondary">
      <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup" accessibilityLabel={q.title}>
        {order.map((id, k) => {
          const o = q.options.find((x) => x.id === id)!;
          return (
            <Animated.View key={id} entering={FadeInDown.duration(320).delay(60 + k * 50).reduceMotion(ReduceMotion.System)}>
              <OptionRow label={o.text} on={value === id} onPress={() => onPick(id)} />
            </Animated.View>
          );
        })}
      </View>
    </Frame>
  );
}

function Review({ answers, onEdit, onReveal, onRestart }: { answers: Answers; onEdit: (i: number) => void; onReveal: () => void; onRestart: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const complete = QUIZ.every((q) => answers[q.id]);
  return (
    <Frame
      title={t('sorting.review.title')}
      sub={t('sorting.review.sub')}
      cta={t('sorting.review.cta')}
      onNext={onReveal}
      disabled={!complete}
      footer={
        <Press onPress={onRestart} accessibilityRole="button" style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md }}>
          <Text variant="small" tone="muted" style={{ textDecorationLine: 'underline' }}>
            {t('sorting.review.restart')}
          </Text>
        </Press>
      }
    >
      <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: spacing.sm }}>
        {QUIZ.map((q, i) => {
          const o = q.options.find((x) => x.id === answers[q.id]);
          return (
            <Press
              key={q.id}
              accessibilityRole="button"
              accessibilityLabel={t('sorting.review.edit', { n: i + 1 })}
              onPress={() => onEdit(i)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: o ? colors.line : colors.danger, backgroundColor: colors.surface, padding: spacing.md }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="caption" tone="muted">
                  {i + 1}. {q.title}
                </Text>
                <Text variant="callout" numberOfLines={2}>
                  {o?.text ?? '—'}
                </Text>
              </View>
              <CaretRightIcon size={14} color={colors.muted} />
            </Press>
          );
        })}
      </ScrollView>
    </Frame>
  );
}

/** Section 4: the question for exactly this pair of tied Houses; each answer is +20 to one of them. */
function PairTieBreak({ pair, order, onPick }: { pair: [HouseId, HouseId]; order: readonly ('a' | 'b')[]; onPick: (id: 'a' | 'b') => void }) {
  const { t } = useTranslation();
  const tb = tieBreakerFor(pair[0], pair[1]);
  return (
    <Frame title={tb.title} sub={`${t('sorting.tie.sub')}\n\n${tb.prompt}`}>
      <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup" accessibilityLabel={tb.title}>
        {order.map((id) => {
          const o = tb.options.find((x) => x.id === id)!;
          return <OptionRow key={id} label={o.text} on={false} onPress={() => onPick(id)} />;
        })}
      </View>
    </Frame>
  );
}

/**
 * Section 5.4: three or four Houses tied. The specification forbids picking a
 * winner arbitrarily, so the reader sees the blended result and chooses.
 */
function MultiTie({ tied, scores, onPick }: { tied: HouseId[]; scores: Scores; onPick: (h: HouseId) => void }) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const rows = breakdown(scores);
  return (
    <Frame title={t('sorting.multi.title')} sub={t('sorting.multi.sub')}>
      <View style={{ gap: spacing.md }}>
        <Percentages rows={rows} />
        {tied.map((h) => {
          const tk = themedHouse(h, dark);
          return (
            <View key={h} style={{ borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, padding: spacing.base, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: tk.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Sigil house={h} size={26} color={tk.onPrimary} label={false} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 21 }} color={tk.ink}>
                    {HOUSE_NAMES[h]}
                  </Text>
                  <Text variant="small" style={{ fontStyle: 'italic' }}>
                    “{t(`houses.${h}.motto`)}”
                  </Text>
                </View>
              </View>
              <Text variant="small" tone="muted">
                {t(`houses.${h}.description`)}
              </Text>
              <Press accessibilityRole="button" onPress={() => onPick(h)} style={{ minHeight: 48, borderRadius: radius.full, backgroundColor: tk.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.semibold }} color={tk.onPrimary}>
                  {t('sorting.multi.join', { house: HOUSE_NAMES[h] })}
                </Text>
              </Press>
            </View>
          );
        })}
      </View>
    </Frame>
  );
}

/** All four House percentages, with the symbol and name next to each bar (never colour alone). */
export function Percentages({ rows, onDark }: { rows: { house: HouseId; pct: number }[]; onDark?: string }) {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const list = rows.map((r) => `${HOUSE_NAMES[r.house]} ${r.pct}%`).join(', ');
  return (
    <View style={{ gap: 6 }} accessibilityLabel={list}>
      {rows.map((r) => (
        <View key={r.house} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Sigil house={r.house} size={16} color={onDark ?? houseInk(r.house, dark)} label={false} />
          <Text variant="caption" style={{ width: 84 }} color={onDark}>
            {HOUSE_NAMES[r.house]}
          </Text>
          <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surface2, overflow: 'hidden' }}>
            <View style={{ width: `${r.pct}%`, height: '100%', backgroundColor: houseTokens[r.house].primary }} />
          </View>
          <Text variant="caption" style={{ width: 40, textAlign: 'right', fontVariant: ['tabular-nums'] }} color={onDark}>
            {r.pct}%
          </Text>
        </View>
      ))}
    </View>
  );
}
