import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ScrollView, View } from "react-native";

import { openBook } from "@/components/books";
import { PepperIcon } from "@/components/icons";
import {
  Chip,
  Cover,
  EmptyState,
  Press,
  Screen,
  Skeleton,
  Text,
} from "@/components/ui";
import { useDebounced } from "@/hooks/use-debounced";
import {
  bookMoods,
  discoverBooks,
  LENGTH_BANDS,
  moodLabel,
  SPICE_BANDS,
  type DiscoverQuery,
} from "@/services/discover-filter";
import { genreTiles } from "@/services/discover";
import { fonts, radius, spacing, useTheme } from "@/theme";
import { tagLabel, TROPES } from "@/utils/review-tags";

const EMPTY: DiscoverQuery = {
  moods: [],
  tropes: [],
  spice: "any",
  length: "any",
  genre: null,
};

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text
        variant="micro"
        tone="muted"
        style={{
          paddingHorizontal: spacing.lg,
          marginBottom: 6,
          textTransform: "uppercase",
        }}
      >
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
        }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** Find books by mood, trope, spice, length and genre. */
export default function Discover() {
  const { colors } = useTheme();
  const [q, setQ] = useState<DiscoverQuery>(EMPTY);
  const query = useDebounced(q, 250);
  const moods = useQuery({
    queryKey: ["bookMoods"],
    queryFn: bookMoods,
    staleTime: 60 * 60_000,
  });
  const genres = useQuery({
    queryKey: ["genreTiles"],
    queryFn: genreTiles,
    staleTime: 60 * 60_000,
  });
  const found = useQuery({
    queryKey: ["discover", query],
    queryFn: () => discoverBooks(query),
    placeholderData: (prev) => prev,
  });
  const toggle = (key: "moods" | "tropes", v: string) =>
    setQ((x) => ({
      ...x,
      [key]: x[key].includes(v)
        ? x[key].filter((y) => y !== v)
        : [...x[key], v],
    }));
  const active =
    q.moods.length +
    q.tropes.length +
    (q.spice !== "any" ? 1 : 0) +
    (q.length !== "any" ? 1 : 0) +
    (q.genre ? 1 : 0);
  const list = found.data ?? [];

  return (
    <Screen title="Find a book" back>
      <Text
        variant="callout"
        tone="muted"
        style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}
      >
        Pick a mood, a trope or how spicy you want it. Books must match
        everything you choose.
      </Text>
      {moods.data?.length ? (
        <Row title="Mood">
          {moods.data.map((m) => (
            <Chip
              key={m}
              active={q.moods.includes(m)}
              onPress={() => toggle("moods", m)}
            >
              {moodLabel(m)}
            </Chip>
          ))}
        </Row>
      ) : null}
      <Row title="Trope">
        {TROPES.map((t) => (
          <Chip
            key={t.key}
            active={q.tropes.includes(t.key)}
            onPress={() => toggle("tropes", t.key)}
          >
            {t.label}
          </Chip>
        ))}
      </Row>
      <Row title="Spice">
        {SPICE_BANDS.map((s) => (
          <Chip
            key={s.id}
            active={q.spice === s.id}
            onPress={() => setQ((x) => ({ ...x, spice: s.id }))}
          >
            {s.label}
          </Chip>
        ))}
      </Row>
      <Row title="Length">
        {LENGTH_BANDS.map((l) => (
          <Chip
            key={l.id}
            active={q.length === l.id}
            onPress={() => setQ((x) => ({ ...x, length: l.id }))}
          >
            {l.label}
          </Chip>
        ))}
      </Row>
      <Row title="Genre">
        <Chip
          active={q.genre === null}
          onPress={() => setQ((x) => ({ ...x, genre: null }))}
        >
          Any genre
        </Chip>
        {(genres.data ?? []).map((g) => (
          <Chip
            key={g.id}
            active={q.genre === g.id}
            onPress={() =>
              setQ((x) => ({ ...x, genre: x.genre === g.id ? null : g.id }))
            }
          >
            {g.name}
          </Chip>
        ))}
      </Row>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.lg,
          marginTop: spacing.sm,
          marginBottom: spacing.md,
        }}
      >
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {found.isLoading
            ? "Searching…"
            : `${list.length}${list.length === 60 ? "+" : ""} ${list.length === 1 ? "book" : "books"}`}
        </Text>
        {active ? (
          <Press
            accessibilityRole="button"
            onPress={() => setQ(EMPTY)}
            hitSlop={8}
          >
            <Text
              variant="small"
              tone="accent"
              style={{ fontFamily: fonts.semibold }}
            >
              Clear filters ({active})
            </Text>
          </Press>
        ) : null}
      </View>

      <View
        style={{
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
          paddingBottom: spacing.xxl,
        }}
      >
        {found.isLoading
          ? [0, 1, 2].map((k) => (
              <Skeleton key={k} height={96} rounded={radius.card} />
            ))
          : null}
        {!found.isLoading && list.length === 0 ? (
          <EmptyState
            title="No book matches all of that"
            body="Try fewer filters. Tropes and spice come from readers' reviews, so newer books may not have them yet."
          />
        ) : null}
        {list.map((b) => (
          <Press
            key={b.id}
            accessibilityLabel={`${b.title}${b.authors ? `, ${b.authors}` : ""}`}
            onPress={() => openBook(b.id)}
            style={{
              flexDirection: "row",
              gap: spacing.md,
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              padding: spacing.md,
            }}
          >
            <Cover
              uri={b.cover_url}
              title={b.title}
              author={b.authors ?? undefined}
              width={56}
            />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text variant="bodyStrong" numberOfLines={2}>
                {b.title}
              </Text>
              {b.authors ? (
                <Text variant="small" tone="muted" numberOfLines={1}>
                  {b.authors}
                </Text>
              ) : null}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 4,
                }}
              >
                {b.spice != null ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 2,
                      borderRadius: radius.full,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      backgroundColor: colors.surface2,
                    }}
                  >
                    <PepperIcon size={11} weight="fill" color={colors.danger} />
                    <Text variant="caption">{b.spice}</Text>
                  </View>
                ) : null}
                {b.pages ? (
                  <View
                    style={{
                      borderRadius: radius.full,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      backgroundColor: colors.surface2,
                    }}
                  >
                    <Text variant="caption">{b.pages} p.</Text>
                  </View>
                ) : null}
                {[
                  ...b.moods.slice(0, 2).map(moodLabel),
                  ...b.tropes.slice(0, 2).map(tagLabel),
                ].map((x) => (
                  <View
                    key={x}
                    style={{
                      borderRadius: radius.full,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      backgroundColor: colors.surface2,
                    }}
                  >
                    <Text variant="caption">{x}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Press>
        ))}
      </View>
    </Screen>
  );
}
