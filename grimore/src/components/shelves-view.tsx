import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { CaretRightIcon, StarIcon } from "@/components/icons";
import {
  Btn,
  Cover,
  EmptyState,
  Press,
  Segmented,
  Text,
} from "@/components/ui";
import { useShelf, useShelfCount } from "@/hooks/queries";
import { listShelves } from "@/services/library";
import { radius, spacing, useTheme } from "@/theme";

type Card = {
  id: string;
  name: string;
  count: number;
  covers: { id: string; title: string; cover_url: string | null }[];
};

function ShelfCard({ s }: { s: Card }) {
  const { colors } = useTheme();
  return (
    <Press
      onPress={() =>
        router.push({
          pathname: "/shelf/[id]",
          params: { id: s.id, name: s.name },
        })
      }
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.base,
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: "row", gap: 4, width: 3 * 38 + 8 }}>
        {s.covers.slice(0, 3).map((b) => (
          <Cover
            key={b.id}
            uri={b.cover_url}
            title={b.title}
            width={38}
            shadow={false}
          />
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" style={{ fontSize: 16 }}>
          {s.name}
        </Text>
        <Text variant="small" tone="muted">
          {s.count} {s.count === 1 ? "book" : "books"}
        </Text>
      </View>
      <CaretRightIcon size={16} color={colors.muted} />
    </Press>
  );
}

export function ShelvesView({
  userId,
  isMe,
}: {
  userId: string;
  isMe: boolean;
}) {
  const reading = useShelf(userId, "reading");
  const readingN = useShelfCount(userId, "reading");
  const read = useShelf(userId, "read");
  const readN = useShelfCount(userId, "read");
  const want = useShelf(userId, "want_to_read");
  const wantN = useShelfCount(userId, "want_to_read");
  const priority = useShelf(userId, "priority");
  const priorityN = useShelfCount(userId, "priority");
  const owned = useShelf(userId, "owned");
  const ownedN = useShelfCount(userId, "owned");
  const dnf = useShelf(userId, "dnf");
  const dnfN = useShelfCount(userId, "dnf");
  const paused = useShelf(userId, "on_hold");
  const pausedN = useShelfCount(userId, "on_hold");
  const [tab, setTab] = useState<"shelves" | "priority">("shelves");
  const custom = useQuery({
    queryKey: ["shelves", userId],
    queryFn: () => listShelves(userId),
  });
  const base: Card[] = [
    { id: `${userId}:reading`, name: "Reading", data: reading.data, n: readingN.data },
    { id: `${userId}:read`, name: "Finished", data: read.data, n: readN.data },
    { id: `${userId}:priority`, name: "Priority", data: priority.data, n: priorityN.data },
    { id: `${userId}:want_to_read`, name: "Wishlist", data: want.data, n: wantN.data },
    { id: `${userId}:owned`, name: "On my shelf", data: owned.data, n: ownedN.data },
    { id: `${userId}:on_hold`, name: "Paused", data: paused.data, n: pausedN.data },
    { id: `${userId}:dnf`, name: "DNF", data: dnf.data, n: dnfN.data },
  ].map((s) => ({
    id: s.id,
    name: s.name,
    count: s.n ?? s.data?.length ?? 0,
    covers: (s.data ?? []).slice(0, 3).map((e) => e.book),
  }));
  const top = priority.data ?? [];
  return (
    <View
      style={{
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
        paddingTop: spacing.sm,
      }}
    >
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "shelves", label: "Shelves" },
          {
            value: "priority",
            label: `Priority${(priorityN.data ?? top.length) ? ` · ${priorityN.data ?? top.length}` : ""}`,
          },
        ]}
      />
      {tab === "priority" ? (
        top.length === 0 ? (
          <EmptyState
            title="No priority books yet"
            body={
              isMe
                ? "Open a book in your Wishlist and tap “Make it a priority” to pin it here."
                : "Nothing pinned as a priority."
            }
          />
        ) : (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: spacing.md,
              paddingTop: spacing.sm,
            }}
          >
            {top.map((e, i) => (
              <Press
                key={e.id}
                accessibilityLabel={`Priority ${i + 1}: ${e.book.title}`}
                onPress={() =>
                  router.push({
                    pathname: "/book/[id]",
                    params: { id: e.book.id },
                  })
                }
                style={{ width: 96, gap: 4 }}
              >
                <Cover uri={e.book.cover_url} title={e.book.title} width={96} />
                <View
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 2,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <StarIcon size={10} weight="fill" color="#E8C26A" />
                  <Text variant="micro" color="#fff">
                    {i + 1}
                  </Text>
                </View>
                <Text variant="caption" numberOfLines={2}>
                  {e.book.title}
                </Text>
              </Press>
            ))}
          </View>
        )
      ) : null}
      {tab === "shelves" ? (
        <>
          {base
            .filter(
              (s) => s.count > 0 || ["Finished", "Wishlist"].includes(s.name),
            )
            .map((s) => (
              <ShelfCard key={s.id} s={s} />
            ))}
          {(custom.data ?? []).map((s) => (
            <ShelfCard
              key={s.id}
              s={{ id: s.id, name: s.title, count: s.count, covers: s.covers }}
            />
          ))}
          {isMe ? (
            <Btn
              variant="ghost"
              full
              style={{ marginTop: spacing.sm }}
              onPress={() => router.push("/shelves/new")}
            >
              New shelf
            </Btn>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
