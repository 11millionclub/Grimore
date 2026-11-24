import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { HourglassIcon, PencilSimpleLineIcon } from '@/components/icons';
import { Btn, Press, Text, TextField } from '@/components/ui';
import type { EntryPatch, LibraryEntry } from '@/services/library';
import { fonts, radius, spacing, useTheme } from '@/theme';

const DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Whole days between starting and finishing (a book started and finished the same day took 1). */
export function daysToRead(e: Pick<LibraryEntry, 'started_on' | 'finished_on'>): number | null {
  if (!e.started_on || !e.finished_on) return null;
  return Math.max(1, Math.round((Date.parse(e.finished_on) - Date.parse(e.started_on)) / DAY) + 1);
}

export function formatMinutes(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/**
 * How long a finished book took: days from start to finish, and the hours
 * you spent with it (reading sessions add to it; you can also type it in).
 */
export function ReadingTimeCard({ entry, onSave }: { entry: LibraryEntry; onSave: (patch: EntryPatch) => void }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const days = daysToRead(entry);
  const [form, setForm] = useState({ days: '', hours: '', minutes: '' });
  const start = () => {
    setForm({ days: days ? String(days) : '', hours: entry.minutes_read ? String(Math.floor(entry.minutes_read / 60)) : '', minutes: entry.minutes_read ? String(entry.minutes_read % 60) : '' });
    setOpen(true);
  };
  const save = () => {
    const d = Math.min(3650, Math.max(0, Math.round(Number(form.days) || 0)));
    const mins = Math.min(100000, Math.max(0, Math.round((Number(form.hours) || 0) * 60 + (Number(form.minutes) || 0))));
    const finished = entry.finished_on ?? isoDay(new Date());
    const patch: EntryPatch = { minutes_read: mins };
    if (d > 0) {
      patch.finished_on = finished;
      patch.started_on = isoDay(new Date(Date.parse(finished) - (d - 1) * DAY));
    }
    onSave(patch);
    setOpen(false);
  };
  const num = (v: string, n: number) => v.replace(/\D/g, '').slice(0, n);
  const summary = [days ? `${days} ${days === 1 ? 'day' : 'days'}` : null, entry.minutes_read ? `${formatMinutes(entry.minutes_read)} reading` : null].filter(Boolean).join(' · ');

  return (
    <>
      <Press
        accessibilityRole="button"
        accessibilityLabel={`How long it took: ${summary || 'not set'}. Edit`}
        onPress={start}
        style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.base, minHeight: 56 }}
      >
        <HourglassIcon size={20} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text variant="callout" style={{ fontFamily: fonts.medium }}>
            How long it took
          </Text>
          <Text variant="caption" tone="muted">
            {summary || 'Add the days and hours this book took you'}
          </Text>
        </View>
        <PencilSimpleLineIcon size={16} color={colors.muted} />
      </Press>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: spacing.lg }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.bg, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md, maxWidth: 420, width: '100%', alignSelf: 'center' }}>
            <Text variant="h2">How long did it take?</Text>
            <TextField label="Days from start to finish" value={form.days} onChangeText={(v) => setForm({ ...form, days: num(v, 4) })} keyboardType="number-pad" placeholder="e.g. 12" />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <TextField label="Hours reading" value={form.hours} onChangeText={(v) => setForm({ ...form, hours: num(v, 4) })} keyboardType="number-pad" placeholder="0" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Minutes" value={form.minutes} onChangeText={(v) => setForm({ ...form, minutes: num(v, 2) })} keyboardType="number-pad" placeholder="0" />
              </View>
            </View>
            <Text variant="caption" tone="muted">
              Reading sessions you time in My Grimore are added here automatically.
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onPress={() => setOpen(false)}>
                Cancel
              </Btn>
              <Btn onPress={save}>Save</Btn>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
