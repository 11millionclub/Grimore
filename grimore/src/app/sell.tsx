import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { BookOpenIcon, CheckIcon, MagnifyingGlassIcon } from '@/components/icons';
import { Toggle } from '@/components/switch';
import { Btn, Chip, Cover, Press, Segmented, Sheet, Text, TextField, toast } from '@/components/ui';
import { useMyId, useMyProfile } from '@/hooks/queries';
import { useDebounced } from '@/hooks/use-debounced';
import { toAppError } from '@/lib/errors';
import { searchCatalogue } from '@/services/catalogue';
import { listByStatus } from '@/services/library';
import { CONDITION_HINTS, CONDITIONS, createListing, DELIVERIES, FORMATS, money, type Condition, type Delivery, type Format } from '@/services/market';
import { fonts, radius, spacing, useTheme } from '@/theme';

type Pickable = { bookId: string; userBookId: string | null; title: string; cover: string | null; authors: string };

function Label({ children, hint }: { children: string; hint?: string }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text variant="small" style={{ fontFamily: fonts.semibold }}>
        {children}
      </Text>
      {hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** List a copy on the Market. Any book can be listed: from your shelves or found by search. */
export default function SellSheet() {
  const params = useLocalSearchParams<{ bookId?: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const profile = useMyProfile();
  const qc = useQueryClient();

  const shelves = useQuery({
    queryKey: ['sellable', me],
    queryFn: async () => {
      const lists = await Promise.all((['owned', 'read', 'reading', 'want_to_read', 'on_hold', 'dnf'] as const).map((s) => listByStatus(me, s, 200)));
      const seen = new Set<string>();
      return lists.flat().flatMap((e): Pickable[] => {
        if (seen.has(e.book.id)) return [];
        seen.add(e.book.id);
        return [{ bookId: e.book.id, userBookId: e.id, title: e.book.title, cover: e.book.cover_url, authors: e.book.authors }];
      });
    },
  });
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim(), 300);
  const found = useQuery({ queryKey: ['catalogue', term, 'sell'], queryFn: () => searchCatalogue(term, 10), enabled: term.length >= 2 });

  const [picked, setPicked] = useState<Pickable | null>(null);
  const fromParam = (shelves.data ?? []).find((p) => p.bookId === params.bookId) ?? null;
  const chosen = picked ?? fromParam;

  const [mode, setMode] = useState<'sale' | 'trade' | 'both'>('sale');
  const [price, setPrice] = useState('');
  const [cond, setCond] = useState<Condition>('very_good');
  const [format, setFormat] = useState<Format | null>('paperback');
  const [language, setLanguage] = useState('');
  const [year, setYear] = useState('');
  const [delivery, setDelivery] = useState<Delivery>('both');
  const [shipping, setShipping] = useState('');
  const [city, setCity] = useState<string | null>(null);
  const [edition, setEdition] = useState('');
  const [note, setNote] = useState('');
  const [rare, setRare] = useState(false);

  const cents = Math.round(Number(price.replace(',', '.')) * 100);
  const shipCents = shipping.trim() ? Math.round(Number(shipping.replace(',', '.')) * 100) : null;
  const yearNum = year.trim() ? Number(year) : null;
  const where = city ?? profile.data?.city ?? '';

  const problem = !chosen
    ? 'Pick the book you want to list first.'
    : mode !== 'trade' && !(Number.isFinite(cents) && cents > 0)
      ? 'Set a price, or choose Trade.'
      : shipCents !== null && !(Number.isFinite(shipCents) && shipCents >= 0 && shipCents <= 10000)
        ? 'Shipping must be between €0 and €100.'
        : yearNum !== null && !(Number.isInteger(yearNum) && yearNum >= 1400 && yearNum <= 2100)
          ? 'The edition year looks wrong.'
          : null;

  const publish = useMutation({
    mutationFn: () =>
      createListing({
        sellerId: me,
        bookId: chosen!.bookId,
        userBookId: chosen!.userBookId,
        mode,
        priceCents: mode === 'trade' ? null : cents,
        condition: cond,
        format,
        language,
        publishedYear: yearNum,
        delivery,
        shippingCents: shipCents,
        edition,
        note,
        isRare: rare,
        city: where,
      }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['market'] });
      router.back();
      toast(`${chosen?.title} is on the Market`);
      setTimeout(() => router.push({ pathname: '/listing/[id]', params: { id: r.id } }), 80);
    },
    onError: (e) => toast(toAppError(e).message),
  });

  const pickRow = (p: Pickable) => {
    const on = chosen?.bookId === p.bookId;
    return (
      <Press key={p.bookId} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={p.title} onPress={() => setPicked(p)} style={{ width: 76, opacity: chosen && !on ? 0.55 : 1 }}>
        <Cover uri={p.cover} title={p.title} author={p.authors} width={76} />
        {on ? (
          <View style={{ position: 'absolute', right: -6, top: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            <CheckIcon size={12} weight="bold" color={colors.onAccent} />
          </View>
        ) : null}
        <Text variant="micro" numberOfLines={2} style={{ marginTop: 4, fontFamily: fonts.medium }}>
          {p.title}
        </Text>
      </Press>
    );
  };

  return (
    <Sheet title="Sell or trade" subtitle="List a copy you own on the Market.">
      <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Label hint="From your shelves, or search any book.">1. The book</Label>
          <View style={{ height: 44, borderRadius: radius.full, backgroundColor: colors.surface2, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 14 }}>
            <MagnifyingGlassIcon size={18} color={colors.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search title or author"
              placeholderTextColor={colors.faint}
              accessibilityLabel="Search a book to list"
              style={{ flex: 1, color: colors.ink, fontFamily: fonts.regular, fontSize: 15 }}
            />
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.md }}>
          {term.length >= 2
            ? (found.data ?? []).map((b) =>
                pickRow({ bookId: b.id, userBookId: (shelves.data ?? []).find((p) => p.bookId === b.id)?.userBookId ?? null, title: b.title, cover: b.cover_url, authors: b.authors }),
              )
            : (shelves.data ?? []).map(pickRow)}
          {term.length < 2 && !shelves.isLoading && !(shelves.data ?? []).length ? (
            <Text variant="callout" tone="muted">
              Your shelves are empty. Search for the book above.
            </Text>
          ) : null}
          {term.length >= 2 && found.isSuccess && !(found.data ?? []).length ? (
            <Text variant="callout" tone="muted">
              No match. Add the book from Search first.
            </Text>
          ) : null}
        </ScrollView>
        {chosen ? (
          <Text variant="small" tone="accent" style={{ paddingHorizontal: spacing.lg, fontFamily: fonts.semibold }} numberOfLines={1}>
            Listing: {chosen.title}
          </Text>
        ) : null}

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg }}>
          <View>
            <Label>2. Sell, trade or both</Label>
            <Segmented value={mode} onChange={setMode} options={[{ value: 'sale', label: 'Sell' }, { value: 'trade', label: 'Trade' }, { value: 'both', label: 'Both' }]} />
          </View>
          {mode !== 'trade' ? (
            <View>
              <TextField label="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="8" right={<Text tone="muted">€</Text>} />
              {cents > 0 ? (
                <View style={{ marginTop: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', borderRadius: radius.tile, backgroundColor: colors.surface2, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
                  <Text variant="small" tone="muted">
                    You will receive, after the 8% fee
                  </Text>
                  <Text variant="small" style={{ fontFamily: fonts.semibold }}>
                    {money(Math.round(cents * 0.92))}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View>
            <Label hint={CONDITION_HINTS[cond]}>3. Condition</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {CONDITIONS.map((c) => (
                <Chip key={c.value} active={cond === c.value} onPress={() => setCond(c.value)}>
                  {c.label}
                </Chip>
              ))}
            </View>
          </View>

          <View>
            <Label>4. Format</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {FORMATS.map((f) => (
                <Chip key={f.value} active={format === f.value} onPress={() => setFormat(format === f.value ? null : f.value)}>
                  {f.label}
                </Chip>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <TextField label="Language" value={language} onChangeText={setLanguage} maxLength={40} placeholder="Portuguese" />
            </View>
            <View style={{ width: 110 }}>
              <TextField label="Edition year" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} placeholder="2019" />
            </View>
          </View>
          <TextField label="Publisher or edition (optional)" value={edition} onChangeText={setEdition} maxLength={140} placeholder="Penguin Classics, 2nd edition…" />

          <View>
            <Label>5. Hand-over</Label>
            <Segmented value={delivery} onChange={setDelivery} options={DELIVERIES} />
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <TextField label="City" value={where} onChangeText={setCity} maxLength={60} placeholder="Lisbon" />
              </View>
              {delivery !== 'pickup' ? (
                <View style={{ width: 130 }}>
                  <TextField label="Shipping" value={shipping} onChangeText={setShipping} keyboardType="decimal-pad" placeholder="3.50" right={<Text tone="muted">€</Text>} />
                </View>
              ) : null}
            </View>
          </View>

          <TextField label="Description (optional)" value={note} onChangeText={setNote} multiline maxLength={1000} placeholder="Read once, no underlining. Dust jacket slightly worn. Prefer to swap for fantasy." />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text>Rare or collectable edition</Text>
              <Text variant="caption" tone="muted">
                First editions, signed or out of print.
              </Text>
            </View>
            <Toggle value={rare} onChange={setRare} label="Rare edition" />
          </View>

          {problem ? (
            <Text variant="small" tone="muted" align="center">
              {problem}
            </Text>
          ) : null}
          <Btn
            size="lg"
            full
            loading={publish.isPending}
            icon={<BookOpenIcon size={18} weight="bold" color={colors.onAccent} />}
            onPress={() => (problem ? toast(problem) : publish.mutate())}
          >
            Publish listing
          </Btn>
        </View>
      </View>
    </Sheet>
  );
}
