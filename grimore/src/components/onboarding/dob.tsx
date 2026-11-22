import { useState } from 'react';
import { View } from 'react-native';

import { TextField, toast } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { toAppError } from '@/lib/errors';
import { saveBirthDate } from '@/services/houses';
import { spacing } from '@/theme';
import { ageBand, ageOn } from '@/utils/sorting';

import { Frame } from './frame';

/** Date of birth (required, private). Under 13 stops here; 13 to 15 continue with a teen account. */
export function DobStep({ userId, onDone, onTooYoung }: { userId: string; onDone: (teen: boolean) => void; onTooYoung: () => void }) {
  const { t } = useTranslation();
  const [dob, setDob] = useState({ d: '', m: '', y: '' });
  const [busy, setBusy] = useState(false);
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
          <TextField label={t('onboarding.dob.day')} value={dob.d} onChangeText={(v) => setDob({ ...dob, d: digits(v, 2) })} keyboardType="number-pad" placeholder="DD" maxLength={2} />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label={t('onboarding.dob.month')} value={dob.m} onChangeText={(v) => setDob({ ...dob, m: digits(v, 2) })} keyboardType="number-pad" placeholder="MM" maxLength={2} />
        </View>
        <View style={{ flex: 1.4 }}>
          <TextField label={t('onboarding.dob.year')} value={dob.y} onChangeText={(v) => setDob({ ...dob, y: digits(v, 4) })} keyboardType="number-pad" placeholder="YYYY" maxLength={4} />
        </View>
      </View>
    </Frame>
  );
}
