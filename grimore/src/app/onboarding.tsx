import { useQueryClient } from '@tanstack/react-query';

import { OnboardingFlow } from '@/components/onboarding/flow';
import { toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { t } from '@/i18n';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { signOut } from '@/services/auth';
import { updatePreferences, updateProfile } from '@/services/profile';
import { HOUSE_NAMES } from '@/theme/houses';

export default function Onboarding() {
  const me = useMyId()!;
  const qc = useQueryClient();
  return (
    <OnboardingFlow
      userId={me}
      onSignOut={() => void signOut().then(() => qc.clear())}
      onFinish={async ({ house, notifications }) => {
        try {
          await updatePreferences(me, { notifications_enabled: notifications });
          await updateProfile(me, { onboarding_completed_at: new Date().toISOString() });
          await Promise.all([qc.invalidateQueries({ queryKey: qk.profile(me) }), qc.invalidateQueries({ queryKey: ['myHouse'] })]);
          toast(t('sorting.welcomeCard.title', { house: HOUSE_NAMES[house] }));
        } catch (e) {
          toast(toAppError(e).message);
        }
      }}
    />
  );
}
