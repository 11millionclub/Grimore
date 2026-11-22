import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { DobStep } from '@/components/onboarding/dob';
import { Frame, StepHeader } from '@/components/onboarding/frame';
import { SortingFlow } from '@/components/onboarding/sorting';
import { toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { t } from '@/i18n';
import { signOut } from '@/services/auth';
import { hasBirthDate } from '@/services/houses';
import { useTheme } from '@/theme';
import { HOUSE_NAMES } from '@/theme/houses';

/** Readers who joined before Houses: date of birth (if missing), then the Sorting. */
export default function SortingScreen() {
  const me = useMyId()!;
  const qc = useQueryClient();
  const { colors } = useTheme();
  const dob = useQuery({ queryKey: ['hasBirthDate', me], queryFn: () => hasBirthDate(me) });
  const [stage, setStage] = useState<'dob' | 'tooYoung' | 'sorting' | null>(null);
  // If the check fails (offline), ask for the date again rather than spin forever.
  const current = stage ?? (dob.isError ? 'dob' : dob.data === undefined ? null : dob.data ? 'sorting' : 'dob');

  if (!current)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {current === 'dob' ? (
        <>
          <StepHeader step={1} total={2} />
          <DobStep userId={me} onTooYoung={() => setStage('tooYoung')} onDone={() => setStage('sorting')} />
        </>
      ) : null}
      {current === 'tooYoung' ? (
        <>
          <StepHeader step={1} total={2} />
          <Frame title={t('onboarding.dob.tooYoungTitle')} sub={t('onboarding.dob.tooYoungBody')} cta={t('onboarding.dob.signOut')} onNext={() => void signOut().then(() => qc.clear())} />
        </>
      ) : null}
      {current === 'sorting' ? (
        <SortingFlow
          stepOffset={1}
          stepTotal={2}
          onDone={(house) => {
            toast(t('sorting.welcomeCard.title', { house: HOUSE_NAMES[house] }));
            void qc.invalidateQueries({ queryKey: ['myHouse'] });
          }}
        />
      ) : null}
    </View>
  );
}
