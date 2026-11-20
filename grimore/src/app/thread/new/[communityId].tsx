import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Toggle } from '@/components/switch';
import { Btn, Screen, Text, TextField, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { createThread } from '@/services/communities';
import { radius, spacing, useTheme } from '@/theme';

export default function NewThread() {
  const { communityId } = useLocalSearchParams<{ communityId: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const create = useMutation({
    mutationFn: () => createThread({ communityId, userId: me, title, body, hasSpoilers: spoiler }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['community', communityId, 'threads'] });
      router.back();
      setTimeout(() => router.push({ pathname: '/thread/[id]', params: { id: r.id } }), 80);
    },
    onError: (e) => toast(toAppError(e).message),
  });
  return (
    <Screen title="New discussion" back keyboard>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.base }}>
        <TextField label="Title" value={title} onChangeText={setTitle} maxLength={140} />
        <TextField label="What do you want to talk about?" value={body} onChangeText={setBody} multiline maxLength={8000} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.card, backgroundColor: colors.surface, paddingHorizontal: spacing.base, height: 56 }}>
          <Text style={{ flex: 1 }}>Contains spoilers</Text>
          <Toggle value={spoiler} onChange={setSpoiler} label="Contains spoilers" />
        </View>
        <Btn size="lg" full disabled={title.trim().length < 3} loading={create.isPending} onPress={() => create.mutate()}>
          Post discussion
        </Btn>
      </View>
    </Screen>
  );
}
