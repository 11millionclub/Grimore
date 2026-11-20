import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { openBook } from '@/components/books';
import { CaretRightIcon, ChatCircleDotsIcon, MapPinIcon, ShieldCheckIcon } from '@/components/icons';
import { Avatar, Btn, Cover, Press, Screen, SectionHead, Skeleton, Text, toast } from '@/components/ui';
import { useMyId } from '@/hooks/queries';
import { toAppError } from '@/lib/errors';
import { getListing, conditionLabel, money, offersForListing, respondToOffer, sellerStats, setListingStatus } from '@/services/market';
import { openConversation, sendMessage } from '@/services/messages';
import { fonts, radius, spacing, useTheme } from '@/theme';
import { relativeTime } from '@/utils/dates';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const me = useMyId()!;
  const qc = useQueryClient();
  const l = useQuery({ queryKey: ['listing', id], queryFn: () => getListing(id) });
  const d = l.data;
  const mine = d?.seller_id === me;
  const stats = useQuery({ queryKey: ['seller', d?.seller_id], queryFn: () => sellerStats(d!.seller_id), enabled: !!d });
  const offers = useQuery({ queryKey: ['offers', id], queryFn: () => offersForListing(id), enabled: !!d });
  const respond = useMutation({
    mutationFn: ({ offer, accept }: { offer: string; accept: boolean }) => respondToOffer(offer, accept),
    onSuccess: (_r, v) => {
      void qc.invalidateQueries({ queryKey: ['offers', id] });
      void qc.invalidateQueries({ queryKey: ['listing', id] });
      toast(v.accept ? 'Offer accepted. The listing is now reserved.' : 'Offer declined');
    },
    onError: (e) => toast(toAppError(e).message),
  });
  const status = useMutation({
    mutationFn: (s: 'active' | 'sold' | 'removed') => setListingStatus(id, s),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['listing', id] });
      void qc.invalidateQueries({ queryKey: ['market'] });
    },
  });
  const contact = async () => {
    try {
      const conv = await openConversation(d!.seller_id);
      await sendMessage({ conversationId: conv, senderId: me, listingId: id, body: `Hi! Is ${d!.book?.title ?? 'this book'} still available?` });
      router.push({ pathname: '/chat/[id]', params: { id: conv } });
    } catch (e) {
      toast(toAppError(e).message);
    }
  };
  if (!d) return <Screen title="" back large={false}><View style={{ paddingHorizontal: spacing.lg }}><Skeleton height={340} rounded={radius.card} /></View></Screen>;
  const trade = d.mode !== 'sale';
  const sale = d.mode !== 'trade';
  return (
    <Screen title={d.book?.title} large={false} back>
      <View style={{ marginHorizontal: spacing.lg, aspectRatio: 1, borderRadius: radius.card, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Press onPress={() => d.book && openBook(d.book.id)} style={{ transform: [{ rotate: '-2deg' }] }}>
          <Cover uri={d.book?.cover_url} title={d.book?.title ?? ''} author={d.book?.authors} width={160} />
        </Press>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 26, lineHeight: 28, letterSpacing: -0.9 }}>{d.book?.title}</Text>
            <Text variant="body" tone="muted">
              {d.book?.authors}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 26, letterSpacing: -0.9 }}>{sale ? money(d.price_cents, d.currency) : 'Trade'}</Text>
            {d.mode === 'both' ? (
              <Text variant="caption" tone="muted">
                or trade
              </Text>
            ) : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.base }}>
          {[conditionLabel(d.condition), d.edition].filter(Boolean).map((t) => (
            <View key={t} style={{ borderRadius: radius.full, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text variant="small">{t}</Text>
            </View>
          ))}
          {d.is_rare ? (
            <View style={{ borderRadius: radius.full, backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text variant="small" tone="accent" style={{ fontFamily: fonts.medium }}>
                Rare edition
              </Text>
            </View>
          ) : null}
          {d.status !== 'active' ? (
            <View style={{ borderRadius: radius.full, backgroundColor: colors.ink, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text variant="small" color={colors.bg}>
                {d.status[0].toUpperCase() + d.status.slice(1)}
              </Text>
            </View>
          ) : null}
        </View>

        <Press onPress={() => d.seller && router.push({ pathname: '/user/[username]', params: { username: d.seller.username } })} style={{ marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: 14 }}>
          <Avatar uri={d.seller?.avatar_url} name={d.seller?.display_name} size={44} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{d.seller?.display_name ?? d.seller?.username}</Text>
            <Text variant="caption" tone="muted">
              {stats.data ? `${stats.data.completed} completed · ${stats.data.active} active` : ' '}
            </Text>
          </View>
          <CaretRightIcon size={16} color={colors.muted} />
        </Press>
        {d.city || d.seller?.city ? (
          <View style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: 14 }}>
            <MapPinIcon size={20} color={colors.muted} />
            <Text style={{ flex: 1 }}>{d.city ?? d.seller?.city}</Text>
            <Text variant="small" tone="muted">
              In person or post
            </Text>
          </View>
        ) : null}
        <View style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: 14 }}>
          <ShieldCheckIcon size={20} weight="fill" color={colors.good} />
          <Text variant="small" tone="muted" style={{ flex: 1 }}>
            <Text variant="small" style={{ fontFamily: fonts.semibold }}>
              Protected purchase, coming soon.
            </Text>{' '}
            In-app payments are not open yet. For now, arrange the swap or sale by message.
          </Text>
        </View>
        {d.note ? (
          <Text variant="body" style={{ marginTop: spacing.lg, opacity: 0.9 }}>
            {d.note}
          </Text>
        ) : null}
        <Text variant="caption" tone="faint" style={{ marginTop: spacing.sm }}>
          Listed {relativeTime(d.created_at)}
        </Text>
      </View>

      {mine ? (
        <>
          <View style={{ marginTop: spacing.xl }}>
            <SectionHead title={`Offers (${offers.data?.length ?? 0})`} />
            <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
              {(offers.data ?? []).length === 0 ? (
                <Text variant="callout" tone="muted">
                  No offers yet.
                </Text>
              ) : (
                (offers.data ?? []).map((o) => (
                  <View key={o.id} style={{ backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.base }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Avatar uri={o.buyer?.avatar_url} name={o.buyer?.display_name} size={28} />
                      <Text variant="callout" style={{ flex: 1, fontFamily: fonts.semibold }}>
                        {o.buyer?.display_name ?? o.buyer?.username}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {o.status}
                      </Text>
                    </View>
                    {o.message ? (
                      <Text variant="callout" style={{ marginTop: spacing.sm }}>
                        {o.message}
                      </Text>
                    ) : null}
                    {o.offered_book_ids.length ? (
                      <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
                        Offers {o.offered_book_ids.length} {o.offered_book_ids.length === 1 ? 'book' : 'books'} in exchange
                      </Text>
                    ) : null}
                    {o.status === 'pending' ? (
                      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                        <Btn size="sm" onPress={() => respond.mutate({ offer: o.id, accept: true })}>
                          Accept
                        </Btn>
                        <Btn size="sm" variant="secondary" onPress={() => respond.mutate({ offer: o.id, accept: false })}>
                          Decline
                        </Btn>
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
            {d.status !== 'sold' ? (
              <Btn variant="secondary" size="lg" style={{ flex: 1 }} onPress={() => status.mutate('sold')}>
                Mark as sold
              </Btn>
            ) : null}
            <Btn variant="ghost" size="lg" style={{ flex: 1 }} onPress={() => status.mutate(d.status === 'removed' ? 'active' : 'removed')}>
              {d.status === 'removed' ? 'Relist' : 'Remove'}
            </Btn>
          </View>
        </>
      ) : (
        <View style={{ gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {trade ? (
              <Btn variant={sale ? 'secondary' : 'primary'} size="lg" style={{ flex: 1 }} disabled={d.status !== 'active'} onPress={() => router.push({ pathname: '/trade/[id]', params: { id } })}>
                Propose a trade
              </Btn>
            ) : null}
            {sale ? (
              <Btn size="lg" style={{ flex: 1 }} disabled={d.status !== 'active'} onPress={() => router.push({ pathname: '/checkout/[id]', params: { id } })}>
                Buy
              </Btn>
            ) : null}
          </View>
          <Btn variant="ghost" size="lg" full icon={<ChatCircleDotsIcon size={18} color={colors.ink} />} onPress={contact}>
            Message the seller
          </Btn>
        </View>
      )}
    </Screen>
  );
}
