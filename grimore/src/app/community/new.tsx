import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInRight, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityCover } from '@/components/books';
import { Toggle } from '@/components/switch';
import { CaretLeftIcon, MinusIcon, PlusIcon, ShieldCheckIcon, XIcon } from '@/components/icons';
import { LibraryScene } from '@/components/scene';
import { Btn, IconBtn, Press, Slider, Text, TextField, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { createCommunity, SCENES, type SceneId } from '@/services/communities';
import { money } from '@/services/market';
import { fonts, radius, spacing, useTheme } from '@/theme';

const STEPS = ['Basics', 'Access', 'Rules', 'Review'];

export default function CreateCommunity() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMyId()!;
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [desc, setDesc] = useState('');
  const [scene, setScene] = useState<SceneId>('great-hall');
  const [paid, setPaid] = useState(false);
  const [price, setPrice] = useState(4);
  const [members, setMembers] = useState(100);
  const [rules, setRules] = useState({ spoiler_tags: true, approve_members: false, live_sessions: true });
  const canNext = step === 0 ? name.trim().length >= 3 : true;
  const gross = price * members * 0.8 + (price * 2 + 1) * members * 0.2;
  const fee = gross * 0.15;

  const create = useMutation({
    mutationFn: () => createCommunity({ hostId: me, name, tagline, description: desc, scene, priceCents: paid ? price * 100 : null, rules }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['communities'] });
      void qc.invalidateQueries({ queryKey: ['my-communities'] });
      router.back();
      setTimeout(() => router.push({ pathname: '/community/[id]', params: { id: r.id } }), 80);
      toast(`${name.trim()} created`);
    },
    onError: (e) => toast(toAppError(e).message),
  });

  const card = { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base } as const;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconBtn label={step ? 'Back' : 'Close'} onPress={() => (step ? setStep(step - 1) : router.back())}>
          {step ? <CaretLeftIcon size={20} weight="bold" color={colors.ink} /> : <XIcon size={20} weight="bold" color={colors.ink} />}
        </IconBtn>
        <Text variant="bodyStrong">New community</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        {STEPS.map((t, i) => (
          <View key={t} style={{ flex: 1 }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.accent : colors.surface3 }} />
            <Text variant="micro" tone={i === step ? 'ink' : 'faint'} style={{ marginTop: 6 }}>
              {t}
            </Text>
          </View>
        ))}
      </View>
      <Animated.View key={step} entering={FadeInRight.duration(300).reduceMotion(ReduceMotion.System)} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
          {step === 0 ? (
            <>
              <View>
                <Text variant="small" tone="muted">
                  Cover
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm, marginHorizontal: -spacing.lg }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
                  {SCENES.map((s) => (
                    <Press key={s} onPress={() => setScene(s)} accessibilityState={{ selected: scene === s }} style={{ width: 128, height: 80, borderRadius: radius.tile, overflow: 'hidden', borderWidth: 2, borderColor: scene === s ? colors.accent : 'transparent' }}>
                      <LibraryScene id={s} style={{ flex: 1 }} />
                    </Press>
                  ))}
                </ScrollView>
              </View>
              <TextField label="Name" value={name} onChangeText={setName} maxLength={60} helper="e.g. Sunday Readers" />
              <TextField label="Tagline" value={tagline} onChangeText={setTagline} maxLength={160} helper="One line that says who it is for." />
              <TextField label="Description" value={desc} onChangeText={setDesc} multiline maxLength={4000} helper="What you read, at what pace, and for whom." />
            </>
          ) : step === 1 ? (
            <>
              <View>
                <Text style={{ fontFamily: fonts.display, fontSize: 28 }}>Who can join?</Text>
                <Text variant="callout" tone="muted" style={{ marginTop: 4 }}>
                  You can change this later.
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {(
                  [
                    [false, 'Open', 'Anyone joins, free'],
                    [true, 'With tiers', 'Part open, part for members'],
                  ] as const
                ).map(([v, t, s]) => (
                  <Press key={String(v)} onPress={() => setPaid(v)} style={{ flex: 1, borderRadius: radius.card, borderWidth: 2, borderColor: paid === v ? colors.accent : colors.line, backgroundColor: paid === v ? colors.accentSoft : colors.surface, padding: spacing.base }}>
                    <Text variant="bodyStrong">{t}</Text>
                    <Text variant="caption" tone="muted">
                      {s}
                    </Text>
                  </Press>
                ))}
              </View>
              {paid ? (
                <View style={{ gap: spacing.sm }}>
                  <View style={card}>
                    <Text variant="bodyStrong">Visitor</Text>
                    <Text variant="small" tone="muted">
                      Free · public posts and the calendar
                    </Text>
                  </View>
                  <View style={card}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text variant="bodyStrong">Circle</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <IconBtn label="Lower price" size={32} filled onPress={() => setPrice(Math.max(1, price - 1))}>
                          <MinusIcon size={14} weight="bold" color={colors.ink} />
                        </IconBtn>
                        <Text style={{ fontFamily: fonts.bold, fontSize: 16, width: 80, textAlign: 'center' }}>{money(price * 100)}/mo</Text>
                        <IconBtn label="Raise price" size={32} filled onPress={() => setPrice(Math.min(99, price + 1))}>
                          <PlusIcon size={14} weight="bold" color={colors.ink} />
                        </IconBtn>
                      </View>
                    </View>
                    <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
                      Chapter discussions, live sessions
                    </Text>
                  </View>
                  <View style={card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="bodyStrong">Patron</Text>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 16 }}>{money((price * 2 + 1) * 100)}/mo</Text>
                    </View>
                    <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
                      Everything in Circle, and picks the book of the quarter
                    </Text>
                  </View>
                  <Text variant="caption" tone="muted">
                    Paid tiers open when payments launch. Until then, everyone can join as a Visitor.
                  </Text>
                </View>
              ) : null}
            </>
          ) : step === 2 ? (
            <>
              <View>
                <Text style={{ fontFamily: fonts.display, fontSize: 28 }}>How it works</Text>
                <Text variant="callout" tone="muted" style={{ marginTop: 4 }}>
                  Simple rules make better conversations.
                </Text>
              </View>
              <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden' }}>
                {(
                  [
                    ['spoiler_tags', 'Spoiler tags by chapter', 'Replies beyond a member’s chapter stay hidden'],
                    ['approve_members', 'Approve new members', 'Useful for small groups'],
                    ['live_sessions', 'Live sessions', 'Group audio with recordings for members'],
                  ] as const
                ).map(([k, t, s], i) => (
                  <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                    <View style={{ flex: 1 }}>
                      <Text>{t}</Text>
                      <Text variant="caption" tone="muted">
                        {s}
                      </Text>
                    </View>
                    <Toggle value={rules[k]} onChange={(v) => setRules({ ...rules, [k]: v })} label={t} />
                  </View>
                ))}
              </View>
              <View style={card}>
                <ShieldCheckIcon size={18} weight="fill" color={colors.good} />
                <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
                  You can name moderators later. Reports reach you and the Grimore team first.
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden' }}>
                <CommunityCover c={{ cover_scene: scene }} height={112} />
                <View style={{ padding: spacing.base }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 19 }}>{name || 'No name'}</Text>
                  <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
                    {tagline || desc || 'No description'}
                  </Text>
                  <Text variant="small" style={{ fontFamily: fonts.semibold, marginTop: spacing.sm }}>
                    {paid ? `Free visitors · Circle ${money(price * 100)} · Patron ${money((price * 2 + 1) * 100)}` : 'Open to everyone'}
                  </Text>
                </View>
              </View>
              {paid ? (
                <View style={card}>
                  <Text variant="bodyStrong">What you could earn</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
                    <Text variant="small" tone="muted">
                      Paying members
                    </Text>
                    <Text variant="small" style={{ fontFamily: fonts.semibold }}>
                      {members}
                    </Text>
                  </View>
                  <Slider value={members} min={10} max={1000} step={10} onChange={setMembers} label="Paying members" />
                  <View style={{ gap: 6, marginTop: spacing.sm }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="callout" tone="muted">
                        Memberships a month
                      </Text>
                      <Text variant="callout">{money(Math.round(gross) * 100)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="callout" tone="muted">
                        Grimore fee (15%)
                      </Text>
                      <Text variant="callout">− {money(Math.round(fee) * 100)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm }}>
                      <Text variant="bodyStrong">You keep 85%</Text>
                      <Text variant="bodyStrong" tone="accent">
                        {money(Math.round(gross - fee) * 100)}/mo
                      </Text>
                    </View>
                  </View>
                  <Text variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
                    An estimate for when payments open. No fixed costs: if nobody pays, you pay nothing.
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </Animated.View>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.md }}>
        {step < STEPS.length - 1 ? (
          <Btn size="lg" full disabled={!canNext} onPress={() => setStep(step + 1)}>
            Continue
          </Btn>
        ) : (
          <Btn size="lg" full loading={create.isPending} onPress={() => create.mutate()}>
            Create community
          </Btn>
        )}
      </View>
    </View>
  );
}
