import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { MusicNotesIcon, PauseIcon, PlayIcon, SpeakerSlashIcon, StopIcon } from '@/components/icons';
import { Btn, Chip, Cover, Press, Screen, Text, toast } from '@/components/ui';
import { useMyId, useShelf } from '@/hooks/queries';
import { musicAvailable, TRACKS } from '@/lib/ambient';
import { toAppError } from '@/lib/errors';
import { refreshLibrary } from '@/lib/query-client';
import { logReadingSession } from '@/services/library';
import { clock, elapsed, useReadingSession } from '@/stores/reading-session';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { formatMinutes } from '@/components/reading-time';

/**
 * A focused reading session: pick the book, start the clock, optionally play
 * rain, a fireplace or soft music. Finishing adds the time to the book.
 */
export default function ReadingSession() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const reading = useShelf(me, 'reading');
  const s = useReadingSession();
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState<{ secs: number; today: number; book: number | null } | null>(null);

  useEffect(() => {
    if (!s.runningSince) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [s.runningSince]);

  // Start on the book you are reading (once); "No particular book" stays a choice.
  const picked = useRef(false);
  const first = reading.data?.[0]?.book.id;
  const { active, bookId, setBook } = s;
  useEffect(() => {
    if (picked.current || !first) return;
    picked.current = true;
    if (!active && !bookId) setBook(first);
  }, [first, active, bookId, setBook]);

  const secs = elapsed(s, now);
  const book = (reading.data ?? []).find((e) => e.book.id === s.bookId)?.book;

  const save = useMutation({
    mutationFn: (seconds: number) => logReadingSession(s.bookId, seconds),
    onSuccess: (r, seconds) => {
      setDone({ secs: seconds, today: r.minutesToday, book: r.minutesBook });
      void refreshLibrary(qc);
    },
    onError: (e) => toast(toAppError(e).message),
  });

  const finish = () => {
    const total = s.finish();
    if (total < 30) return toast('Under 30 seconds, so it was not saved');
    save.mutate(total);
  };

  if (done) {
    return (
      <Screen title="Session saved" back>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg, alignItems: 'center', paddingTop: spacing.xl }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 56, lineHeight: 64 }} tone="accent">
            {clock(done.secs)}
          </Text>
          <Text variant="body" tone="muted" align="center">
            {formatMinutes(done.today)} of reading today
            {book && done.book != null ? ` · ${formatMinutes(done.book)} with ${book.title}` : ''}
          </Text>
          {book ? (
            <Btn full onPress={() => router.replace({ pathname: '/progress/[bookId]', params: { bookId: book.id } })}>
              Log the page you reached
            </Btn>
          ) : null}
          <Btn
            full
            variant="secondary"
            onPress={() => {
              setDone(null);
              s.reset();
            }}
          >
            Start another session
          </Btn>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Reading session" back>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xl }}>
        <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: s.runningSince ? colors.accent : colors.line }}>
          <Text accessibilityRole="timer" accessibilityLabel={`Elapsed ${clock(secs)}`} style={{ fontFamily: fonts.display, fontSize: 64, lineHeight: 72, fontVariant: ['tabular-nums'] }}>
            {clock(secs)}
          </Text>
          <Text variant="small" tone="muted">
            {!s.active ? 'Ready when you are' : s.runningSince ? 'Reading…' : 'Paused'}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
            {!s.active ? (
              <Btn icon={<PlayIcon size={18} weight="fill" color={colors.onAccent} />} onPress={s.start}>
                Start reading session
              </Btn>
            ) : (
              <>
                {s.runningSince ? (
                  <Btn variant="secondary" icon={<PauseIcon size={18} weight="fill" color={colors.ink} />} onPress={s.pause}>
                    Pause
                  </Btn>
                ) : (
                  <Btn variant="secondary" icon={<PlayIcon size={18} weight="fill" color={colors.ink} />} onPress={s.resume}>
                    Resume
                  </Btn>
                )}
                <Btn loading={save.isPending} icon={<StopIcon size={18} weight="fill" color={colors.onAccent} />} onPress={finish}>
                  Finish
                </Btn>
              </>
            )}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="small" tone="muted">
            What are you reading?
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            <Press onPress={() => s.setBook(null)} style={{ width: 72, height: 108, borderRadius: radius.tile, borderWidth: s.bookId ? 1 : 2, borderColor: s.bookId ? colors.line : colors.accent, alignItems: 'center', justifyContent: 'center', padding: 6 }}>
              <Text variant="caption" align="center" tone="muted">
                No particular book
              </Text>
            </Press>
            {(reading.data ?? []).map((e) => (
              <Press key={e.id} accessibilityLabel={e.book.title} accessibilityState={{ selected: s.bookId === e.book.id }} onPress={() => s.setBook(e.book.id)} style={{ opacity: s.bookId && s.bookId !== e.book.id ? 0.55 : 1, borderRadius: radius.tile, borderWidth: s.bookId === e.book.id ? 2 : 0, borderColor: colors.accent }}>
                <Cover uri={e.book.cover_url} title={e.book.title} width={72} />
              </Press>
            ))}
          </ScrollView>
          {book ? (
            <Text variant="small" numberOfLines={1}>
              {book.title}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <MusicNotesIcon size={18} color={colors.muted} />
            <Text variant="small" tone="muted">
              Background sound
            </Text>
          </View>
          {musicAvailable ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Chip active={!s.track} onPress={() => s.setTrack(null)} icon={<SpeakerSlashIcon size={14} color={!s.track ? colors.onAccent : colors.muted} />}>
                Silence
              </Chip>
              {TRACKS.map((t) => (
                <Chip key={t.id} active={s.track === t.id} onPress={() => s.setTrack(t.id)}>
                  {t.label}
                </Chip>
              ))}
            </View>
          ) : (
            <Text variant="caption" tone="muted">
              Background sound arrives with the next version of the app. It already works on grimore.expo.app.
            </Text>
          )}
        </View>
      </View>
    </Screen>
  );
}
