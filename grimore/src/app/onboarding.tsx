import { useQueryClient } from '@tanstack/react-query';

import { OnboardingFlow } from '@/components/onboarding-flow';
import { toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { saveOnboarding } from '@/services/onboarding';
import { ARCHETYPES } from '@/utils/archetypes';

export default function Onboarding() {
  const me = useMyId()!;
  const qc = useQueryClient();
  return (
    <OnboardingFlow
      userId={me}
      onFinish={async (r) => {
        try {
          await saveOnboarding(me, r, true);
          await qc.invalidateQueries({ queryKey: qk.profile(me) });
          toast(`Welcome to Grimore, ${ARCHETYPES[r.archetype].name}`);
        } catch (e) {
          toast(toAppError(e).message);
        }
      }}
    />
  );
}
