import { useRef, useState, type ElementRef } from 'react';
import { View, type TextInput } from 'react-native';

import { TextField, toast } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { toAppError } from '@/lib/errors';
import { saveBirthDate } from '@/services/houses';
import { spacing } from '@/theme';
import { ageBand, ageOn } from '@/utils/sorting';

import { Frame } from './frame';

type Input = ElementRef<typeof TextInput>;

/** Date of birth (required, private). Under 13 stops here; 13 to 15 continue with a teen account. */
export function DobStep({ userId, onDone, onTooYoung }: { userId: string; onDone: (teen: boolean) => void; onTooYoung: () => void }) {
  const { t } = useTranslation();
  const [dob, setDob] = useState({ d: '', m: '', y: '' });
  const [busy, setBusy] = useState(false);
  const monthRef = useRef<Input>(null);
  const yearRef = useRef<Input>(null);
  const save = async () => {
    const d = Number(dob.d);
    const m = Number(dob.m);
    const y = Number(dob.y);
    const date = new Date(Date.UTC(y, m - 1, d));
    const now = new Date();
    if (!y || !m || !d || date.getUTCDate() !== d || date.getUTCMonth() !== m - 1 || y < 1900 || date > now) return toast(t('onboarding.dob.invalid'));
    const band = ageBand(ageOn(date, now));
    if (band === 'under13') return onTooYoung();
    setBusy(true);
    try {
      await saveBirthDate(userId, date.toISOString().slice(0, 10));
      onDone(band === 'teen');
    } catch (e) {
      if (String((e as Error)?.message ?? '').includes('too_young')) onTooYoung();
      else toast(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };
  const digits = (v: string, n: number) => v.replace(/\D/g, '').slice(0, n);
  return (
    <Frame title={t('onboarding.dob.title')} sub={t('onboarding.dob.sub')} cta={t('common.continue')} busy={busy} disabled={!dob.d || !dob.m || dob.y.length !== 4} onNext={() => void save()}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <TextField
            label={t('onboarding.dob.day')}
            value={dob.d}
            onChangeText={(v) => {
              const d = digits(v, 2);
              setDob({ ...dob, d });
              // Two digits, or a first digit that can only be a whole day (4-9), moves on to the month.
              if (d.length === 2 || /^[4-9]$/.test(d)) monthRef.current?.focus();
            }}
            keyboardType="number-pad"
            placeholder="DD"
            maxLength={2}
            returnKeyType="next"
            autoFocus
            onSubmitEditing={() => monthRef.current?.focus()}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            ref={monthRef}
            label={t('onboarding.dob.month')}
            value={dob.m}
            onChangeText={(v) => {
              const m = digits(v, 2);
              setDob({ ...dob, m });
              if (m.length === 2 || /^[2-9]$/.test(m)) yearRef.current?.focus();
            }}
            keyboardType="number-pad"
            placeholder="MM"
            maxLength={2}
            returnKeyType="next"
            onSubmitEditing={() => yearRef.current?.focus()}
          />
        </View>
        <View style={{ flex: 1.4 }}>
          <TextField
            ref={yearRef}
            label={t('onboarding.dob.year')}
            value={dob.y}
            onChangeText={(v) => setDob({ ...dob, y: digits(v, 4) })}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === 'Backspace' && !dob.y) monthRef.current?.focus();
            }}
            keyboardType="number-pad"
            placeholder="YYYY"
            maxLength={4}
            returnKeyType="done"
            onSubmitEditing={() => void save()}
          />
        </View>
      </View>
    </Frame>
  );
}
