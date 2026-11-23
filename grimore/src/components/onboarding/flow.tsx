import { getLocales } from 'expo-localization';
import { useState, type ComponentType } from 'react';
import { View } from 'react-native';
import Animated, { FadeInRight, ReduceMotion } from 'react-native-reanimated';

import { BookOpenIcon, BooksIcon, ChatsCircleIcon, CheckIcon, DeviceTabletIcon, GameControllerIcon, HeadphonesIcon, MagnifyingGlassIcon, type IconProps } from '@/components/icons';
import { ImportPanel } from '@/components/import-panel';
import { Btn, Slider, Text, toast } from '@/components/ui';
import { useGenres } from '@/hooks/queries';
import { useTranslation } from '@/i18n';
import { toAppError } from '@/lib/errors';
import { importBook } from '@/services/books';
import { setGoal } from '@/services/library';
import { addFavoriteBook, setFavoriteGenres, updatePreferences } from '@/services/profile';
import { fonts, spacing, useTheme } from '@/theme';
import type { HouseId } from '@/theme/houses';

import { DobStep } from './dob';
import { ChoiceChip, Frame, StepHeader } from './frame';
import { SortingFlow } from './sorting';
import { TopFour, type Pick } from './top-four';

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'sv', label: 'Svenska' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
];
const FORMATS: { id: 'print' | 'ebook' | 'audio'; Icon: ComponentType<IconProps> }[] = [
  { id: 'print', Icon: BookOpenIcon },
  { id: 'ebook', Icon: DeviceTabletIcon },
  { id: 'audio', Icon: HeadphonesIcon },
];
const INTENTS: { id: 'track' | 'discover' | 'talk' | 'games'; Icon: ComponentType<IconProps> }[] = [
  { id: 'track', Icon: BooksIcon },
  { id: 'discover', Icon: MagnifyingGlassIcon },
  { id: 'talk', Icon: ChatsCircleIcon },
  { id: 'games', Icon: GameControllerIcon },
];
const WARNINGS = ['violence', 'sexual', 'selfHarm', 'abuse', 'addiction', 'death'] as const;

const SETUP = ['dob', 'languages', 'formats', 'genres', 'import', 'top4', 'intents', 'goal', 'warnings'] as const;
type Step = (typeof SETUP)[number] | 'tooYoung' | 'sorting' | 'notify';
const TOTAL = SETUP.length + 2; // + Sorting + notifications

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function deviceLanguages(): string[] {
  try {
    return [...new Set(getLocales().map((l) => l.languageCode ?? 'en'))];
  } catch {
    return ['en'];
  }
}

/**
 * Onboarding after sign-up: setup (what the app needs), then the Sorting,
 * then reminders. Under 2.5 minutes, one question per screen.
 */
export function OnboardingFlow({ userId, onFinish, onSignOut }: { userId: string; onFinish: (r: { house: HouseId; notifications: boolean }) => Promise<void> | void; onSignOut: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const genres = useGenres();
  const device = deviceLanguages();
  const [step, setStep] = useState<Step>('dob');
  const [teen, setTeen] = useState(false);
  const [langs, setLangs] = useState<string[]>(device.filter((c) => LANGUAGES.some((l) => l.code === c)).slice(0, 2));
  const [formats, setFormats] = useState<string[]>([]);
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [intents, setIntents] = useState<string[]>([]);
  const [goal, setGoalN] = useState<number | null>(24);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [house, setHouse] = useState<HouseId | null>(null);
  const [busy, setBusy] = useState(false);

  const idx = SETUP.indexOf(step as (typeof SETUP)[number]);
  const next = () => setStep(idx >= 0 && idx < SETUP.length - 1 ? SETUP[idx + 1] : 'sorting');
  const back = () => (idx > 0 ? setStep(SETUP[idx - 1]) : undefined);
  const languages = [...LANGUAGES].sort((a, b) => Number(device.includes(b.code)) - Number(device.includes(a.code)));
  const slugs = (genres.data ?? []).filter((g) => genreIds.includes(g.id)).map((g) => g.slug);

  /** Saved before the Sorting, so nothing is lost if the app closes during the quiz. */
  const saveSetup = async () => {
    setBusy(true);
    try {
      await updatePreferences(userId, { reading_languages: langs, reading_formats: formats, intents, content_warnings: warnings });
      if (genreIds.length) await setFavoriteGenres(userId, genreIds);
      const ids = await Promise.all(picks.map((p) => (p.id ? Promise.resolve(p.id) : importBook(p.external!).catch(() => null))));
      await Promise.allSettled([
        ...ids.map((id, i) => (id ? addFavoriteBook(userId, id, i) : Promise.resolve())),
        goal ? setGoal(userId, new Date().getFullYear(), goal) : Promise.resolve(),
      ]);
      setStep('sorting');
    } catch (e) {
      toast(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const chips = (items: { key: string; label: string; icon?: React.ReactNode; on: boolean; onPress: () => void }[]) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {items.map((c) => (
        <ChoiceChip key={c.key} label={c.label} on={c.on} onPress={c.onPress} icon={c.on ? <CheckIcon size={14} weight="bold" color={colors.onAccent} /> : c.icon} />
      ))}
    </View>
  );

  if (step === 'tooYoung')
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StepHeader step={1} total={TOTAL} />
        <Frame title={t('onboarding.dob.tooYoungTitle')} sub={t('onboarding.dob.tooYoungBody')} cta={t('onboarding.dob.signOut')} onNext={onSignOut} />
      </View>
    );

  if (step === 'sorting')
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <SortingFlow
          stepOffset={SETUP.length}
          stepTotal={TOTAL}
          onBack={() => setStep('warnings')}
          onDone={(h) => {
            setHouse(h);
            setStep('notify');
          }}
        />
      </View>
    );

  const done = async (notifications: boolean) => {
    if (!house) return;
    setBusy(true);
    try {
      await onFinish({ house, notifications });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StepHeader
        step={step === 'notify' ? TOTAL : idx + 1}
        total={TOTAL}
        onBack={step === 'notify' ? undefined : idx > 0 ? back : undefined}
        onSkip={['import', 'top4', 'intents', 'warnings', 'formats'].includes(step) ? (step === 'warnings' ? () => void saveSetup() : next) : undefined}
      />
      <Animated.View key={step} entering={FadeInRight.duration(260).reduceMotion(ReduceMotion.System)} style={{ flex: 1 }}>
        {step === 'dob' ? (
          <DobStep
            userId={userId}
            onTooYoung={() => setStep('tooYoung')}
            onDone={(isTeen) => {
              setTeen(isTeen);
              next();
            }}
          />
        ) : null}

        {step === 'languages' ? (
          <Frame title={t('onboarding.languages.title')} sub={t('onboarding.languages.sub')} cta={t('common.continue')} disabled={!langs.length} onNext={next}>
            {teen ? (
              <Text variant="small" tone="muted" style={{ marginBottom: spacing.md }}>
                {t('onboarding.dob.teenNote')}
              </Text>
            ) : null}
            {chips(languages.map((l) => ({ key: l.code, label: l.label, on: langs.includes(l.code), onPress: () => setLangs(toggle(langs, l.code)) })))}
          </Frame>
        ) : null}

        {step === 'formats' ? (
          <Frame title={t('onboarding.formats.title')} sub={t('onboarding.formats.sub')} cta={t('common.continue')} onNext={next}>
            {chips(FORMATS.map(({ id, Icon }) => ({ key: id, label: t(`onboarding.formats.${id}`), icon: <Icon size={16} color={colors.ink} />, on: formats.includes(id), onPress: () => setFormats(toggle(formats, id)) })))}
          </Frame>
        ) : null}

        {step === 'genres' ? (
          <Frame title={t('onboarding.genres.title')} sub={t('onboarding.genres.sub')} cta={genreIds.length < 3 ? t('onboarding.genres.more', { n: 3 - genreIds.length }) : t('common.continue')} disabled={genreIds.length < 3} onNext={next}>
            {chips((genres.data ?? []).map((g) => ({ key: String(g.id), label: g.name, on: genreIds.includes(g.id), onPress: () => setGenreIds(toggle(genreIds, g.id)) })))}
          </Frame>
        ) : null}

        {step === 'import' ? (
          <Frame title={t('onboarding.import.title')} sub={t('onboarding.import.sub')} cta={t('onboarding.import.later')} ctaVariant="secondary" onNext={next}>
            <ImportPanel onDone={next} />
          </Frame>
        ) : null}

        {step === 'top4' ? <TopFour picks={picks} setPicks={setPicks} genreIds={genreIds} genreSlugs={slugs} onNext={next} /> : null}

        {step === 'intents' ? (
          <Frame title={t('onboarding.intents.title')} sub={t('onboarding.intents.sub')} cta={t('common.continue')} onNext={next}>
            {chips(INTENTS.map(({ id, Icon }) => ({ key: id, label: t(`onboarding.intents.${id}`), icon: <Icon size={16} color={colors.ink} />, on: intents.includes(id), onPress: () => setIntents(toggle(intents, id)) })))}
          </Frame>
        ) : null}

        {step === 'goal' ? (
          <Frame title={t('onboarding.goal.title')} sub={t('onboarding.goal.sub')} cta={goal ? t('onboarding.goal.cta', { n: goal }) : t('common.continue')} onNext={next}>
            <Text align="center" style={{ fontFamily: fonts.display, fontSize: 72, lineHeight: 84, opacity: goal ? 1 : 0.3 }}>
              {goal ?? '—'}
            </Text>
            <Text variant="callout" tone="muted" align="center">
              {goal ? t('onboarding.goal.perMonth', { n: Math.max(1, Math.round(goal / 12)) }) : t('onboarding.goal.none')}
            </Text>
            <View style={{ marginTop: spacing.xl, opacity: goal ? 1 : 0.4 }}>
              <Slider value={goal ?? 24} min={6} max={100} onChange={(v) => setGoalN(Math.round(v))} label={t('onboarding.goal.title')} />
            </View>
            <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
              <ChoiceChip label={t('onboarding.goal.none')} on={goal === null} onPress={() => setGoalN(goal === null ? 24 : null)} />
            </View>
          </Frame>
        ) : null}

        {step === 'warnings' ? (
          <Frame title={t('onboarding.warnings.title')} sub={t('onboarding.warnings.sub')} cta={t('common.continue')} busy={busy} onNext={() => void saveSetup()}>
            {chips(WARNINGS.map((w) => ({ key: w, label: t(`onboarding.warnings.${w}`), on: warnings.includes(w), onPress: () => setWarnings(toggle(warnings, w)) })))}
          </Frame>
        ) : null}

        {step === 'notify' ? (
          <Frame
            title={t('onboarding.notify.title')}
            sub={t('onboarding.notify.sub')}
            cta={t('onboarding.notify.yes')}
            busy={busy}
            onNext={() => void done(true)}
            footer={
              <Btn variant="ghost" full onPress={() => void done(false)}>
                {t('onboarding.notify.no')}
              </Btn>
            }
          />
        ) : null}
      </Animated.View>
    </View>
  );
}
