import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookSearch } from '@/components/book-search';
import { BookCover, Button, Chip, ChipGroup, Icon, InlineAlert, ProgressBar, Screen, Text, type IconName } from '@/components/ui';
import { useGenres, useMyProfile } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import type { BookSummary } from '@/services/catalogue';
import { saveEntry, type ReadingStatus } from '@/services/library';
import { addFavoriteBook, setFavoriteGenres, updatePreferences, updateProfile } from '@/services/profile';
import { useUserId } from '@/stores/session';
import { layout, radius, spacing, useTheme } from '@/theme';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
];

const STEPS = ['welcome', 'genres', 'language', 'books', 'favourites', 'games'] as const;
type Step = (typeof STEPS)[number];

type Added = BookSummary & { status: ReadingStatus };

export default function Onboarding() {
  const userId = useUserId();
  const profile = useMyProfile();
  const genres = useGenres();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [step, setStep] = useState<Step>('welcome');
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [language, setLanguage] = useState('en');
  const [added, setAdded] = useState<Added[]>([]);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const index = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(index + 1, STEPS.length - 1)]);
  const back = () => setStep(STEPS[Math.max(index - 1, 0)]);
  const name = profile.data?.display_name?.split(' ')[0] ?? 'reader';

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const addBook = (book: BookSummary, status: ReadingStatus) =>
    run(async () => {
      await saveEntry(userId, book.id, { status });
      setAdded((list) => [...list.filter((b) => b.id !== book.id), { ...book, status }]);
    });

  const finish = () =>
    run(async () => {
      await Promise.all([
        setFavoriteGenres(userId, selectedGenres),
        updatePreferences(userId, { reading_language: language }),
        ...favourites.map((id, i) => addFavoriteBook(userId, id, i)),
      ]);
      const updated = await updateProfile(userId, { onboarding_completed_at: new Date().toISOString() });
      queryClient.setQueryData(qk.profile(userId), updated);
      void queryClient.invalidateQueries({ queryKey: qk.libraryAll });
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: layout.screenPadding, gap: spacing.md, maxWidth: layout.maxContentWidth, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 32 }}>
          {index > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={12}>
              <Icon name="arrow-left" />
            </Pressable>
          ) : (
            <View />
          )}
          <Text variant="caption">
            {index + 1} of {STEPS.length}
          </Text>
        </View>
        <ProgressBar value={(index + 1) / STEPS.length} />
      </View>

      <Animated.View key={step} entering={FadeIn.duration(260)} exiting={FadeOut.duration(120)} style={{ flex: 1 }}>
        <Screen edgeTop={false} contentStyle={{ paddingBottom: 140 }}>
          {error ? (
            <View style={{ marginBottom: spacing.base }}>
              <InlineAlert>{error}</InlineAlert>
            </View>
          ) : null}

          {step === 'welcome' && (
            <Intro
              eyebrow="Welcome to GriMore"
              title={`A home for your reading life, ${name}.`}
              body="In a few steps we will set up your shelves and introduce today’s literary challenges. You can change everything later."
            />
          )}

          {step === 'genres' && (
            <>
              <Intro eyebrow="Taste" title="What do you love to read?" body="Choose as many as you like. We use them to suggest books, never to limit you." />
              <ChipGroup>
                {(genres.data ?? []).map((g) => (
                  <Chip
                    key={g.id}
                    label={g.name}
                    selected={selectedGenres.includes(g.id)}
                    onPress={() => setSelectedGenres((s) => (s.includes(g.id) ? s.filter((x) => x !== g.id) : [...s, g.id]))}
                  />
                ))}
              </ChipGroup>
            </>
          )}

          {step === 'language' && (
            <>
              <Intro eyebrow="Language" title="Which language do you usually read in?" body="This helps us show the right editions and covers." />
              <View style={{ gap: spacing.sm }}>
                {LANGUAGES.map((l) => (
                  <OptionRow key={l.code} label={l.label} selected={language === l.code} onPress={() => setLanguage(l.code)} />
                ))}
              </View>
            </>
          )}

          {step === 'books' && (
            <>
              <Intro eyebrow="Your shelves" title="Add a few books" body="Something you are reading now, something you loved, something you mean to read." />
              {added.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg }}>
                  {added.map((b) => (
                    <View key={b.id} style={{ width: 72, gap: spacing.xs }}>
                      <BookCover title={b.title} author={b.authors} uri={b.cover_url} width={72} />
                      <Text variant="caption" numberOfLines={1}>
                        {b.status === 'reading' ? 'Reading' : b.status === 'read' ? 'Read' : 'Want'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <BookSearch
                excludeIds={added.map((b) => b.id)}
                onSelect={(b) => addBook(b, 'want_to_read')}
                renderTrailing={(b) => (
                  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                    <MiniAction label="Reading" icon="book-open" onPress={() => void addBook(b, 'reading')} />
                    <MiniAction label="Read" icon="check" onPress={() => void addBook(b, 'read')} />
                  </View>
                )}
              />
            </>
          )}

          {step === 'favourites' && (
            <>
              <Intro eyebrow="Favourites" title="Which of these do you treasure?" body="Favourites appear on your profile and in My Corner. Tap to choose up to six." />
              {added.length === 0 ? (
                <Text variant="callout" tone="muted">
                  Add some books in the previous step, or skip this for now.
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.base }}>
                  {added.map((b) => {
                    const on = favourites.includes(b.id);
                    return (
                      <Pressable
                        key={b.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={b.title}
                        onPress={() => setFavourites((f) => (on ? f.filter((x) => x !== b.id) : f.length < 6 ? [...f, b.id] : f))}
                        style={{ opacity: on || favourites.length < 6 ? 1 : 0.4 }}
                      >
                        <BookCover title={b.title} author={b.authors} uri={b.cover_url} width={96} accessible={false} />
                        {on ? (
                          <View style={{ position: 'absolute', top: spacing.xs, right: spacing.xs, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="heart" size={13} color={colors.onAccent} />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {step === 'games' && (
            <>
              <Intro eyebrow="Every day" title="Three small puzzles, one shared day." body="Everyone in the world gets the same challenges each day. Play one to keep your streak; play all three for a Perfect Day." />
              <View style={{ gap: spacing.md }}>
                <GameIntro icon="grid" title="Bookle" body="Guess the book in six tries. Each guess reveals clues about its decade, genre, author and length." />
                <GameIntro icon="image" title="Cover Reveal" body="A cover, mostly hidden. Ask for up to three hints, then name the book." />
                <GameIntro icon="help-circle" title="Literary Quiz" body="One question, four answers, a short story behind the answer." />
              </View>
            </>
          )}
        </Screen>
      </Animated.View>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: layout.screenPadding,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.lg,
          backgroundColor: colors.canvas,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: spacing.sm,
        }}
      >
        {step === 'games' ? (
          <Button title="Enter GriMore" size="lg" fullWidth loading={busy} onPress={() => void finish()} />
        ) : (
          <Button
            title={step === 'books' && added.length === 0 ? 'Skip for now' : step === 'favourites' && favourites.length === 0 ? 'Skip' : 'Continue'}
            variant={(step === 'books' && added.length === 0) || (step === 'favourites' && favourites.length === 0) ? 'secondary' : 'primary'}
            size="lg"
            fullWidth
            disabled={busy}
            onPress={next}
          />
        )}
      </View>
    </View>
  );
}

function Intro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <View style={{ gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.xl }}>
      <Text variant="eyebrow" tone="accent">
        {eyebrow}
      </Text>
      <Text variant="title1" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="body" tone="muted">
        {body}
      </Text>
    </View>
  );
}

function OptionRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.base,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: selected ? colors.ink : colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <Text variant="bodyStrong">{label}</Text>
      <Icon name={selected ? 'check-circle' : 'circle'} size={18} tone={selected ? 'accent' : 'inkSubtle'} />
    </Pressable>
  );
}

function MiniAction({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add as ${label}`}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
      })}
    >
      <Icon name={icon} size={15} tone="ink" />
    </Pressable>
  );
}

function GameIntro({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.base, padding: spacing.base, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} tone="accent" />
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="title3">{title}</Text>
        <Text variant="callout" tone="muted">
          {body}
        </Text>
      </View>
    </View>
  );
}
