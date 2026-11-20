import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { OnboardingFlow } from '@/components/onboarding-flow';
import { goBack, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { qk } from '@/lib/query-client';
import { saveOnboarding } from '@/services/onboarding';
import { ARCHETYPES } from '@/utils/archetypes';

/** Retake the reader test from Reader DNA. */
export default function Quiz() {
  const me = useMyId()!;
  const qc = useQueryClient();
  return (
    <OnboardingFlow
      quizOnly
      userId={me}
      onExit={goBack}
      onFinish={async (r) => {
        try {
          await saveOnboarding(me, r, false);
          await qc.invalidateQueries({ queryKey: qk.profile(me) });
          toast(`You are a ${ARCHETYPES[r.archetype].name}`);
          router.back();
        } catch (e) {
          toast(toAppError(e).message);
        }
      }}
    />
  );
}
