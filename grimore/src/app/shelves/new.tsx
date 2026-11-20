import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Toggle } from '@/components/switch';
import { LockSimpleIcon } from '@/components/icons';
import { Btn, Sheet, Text, TextField, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { createShelf } from '@/services/library';
import { radius, spacing, useTheme } from '@/theme';

export default function NewShelf() {
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [priv, setPriv] = useState(false);
  const create = useMutation({
    mutationFn: () => createShelf(me, name, !priv),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['shelves', me] });
      router.back();
      toast(`Shelf “${name.trim()}” created`);
    },
    onError: (e) => toast(toAppError(e).message),
  });
  return (
    <Sheet title="New shelf">
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.base, gap: spacing.base }}>
        <TextField label="Name" value={name} onChangeText={setName} maxLength={60} helper="e.g. Summer reads, Borrowed, Signed copies" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.tile, backgroundColor: colors.surface2, paddingHorizontal: spacing.base, paddingVertical: spacing.md }}>
          <LockSimpleIcon size={20} color={colors.muted} />
          <Text style={{ flex: 1 }}>Private</Text>
          <Toggle value={priv} onChange={setPriv} label="Private shelf" />
        </View>
        <Btn size="lg" full disabled={name.trim().length < 2} loading={create.isPending} onPress={() => create.mutate()}>
          Create shelf
        </Btn>
      </View>
    </Sheet>
  );
}
