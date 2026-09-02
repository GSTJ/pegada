import type { StoryPhoto } from "./types";

/**
 * `photos.ts` and `variants.ts` are the only two modules in the story card
 * that hold a decision worth pinning without rendering: which photo lands in
 * which slot, and which composition ships by default. `variants.ts` pulls in
 * both variant components (and through them `react-native`, `expo-image`,
 * Unistyles), which this suite has no RN preset for — same constraint as
 * `share-actions.test.ts` — so the two components are stubbed out and the
 * registry's own shape is what gets asserted.
 */
jest.mock<Record<string, unknown>>("./variants/dm-aberta", () => ({
  DmAbertaVariant: () => null,
}));

jest.mock<Record<string, unknown>>("./variants/role-ticket", () => ({
  RoleTicketVariant: () => null,
}));

import {
  mosaicSlots,
  planStoryPhotos,
  stampSlot,
  STORY_MAX_PHOTOS,
} from "./photos";
import {
  DEFAULT_STORY_VARIANT,
  STORY_VARIANTS,
  type StoryVariantId,
} from "./variants";

/** `n` photos with distinguishable URLs, so order is checkable by value. */
const photos = (count: number): StoryPhoto[] =>
  Array.from({ length: count }, (_, index) => ({
    url: `https://cdn.pegada.app/${index}.jpg`,
    blurhash: null,
  }));

/** The nth photo's URL, without the index-signature dance in every test. */
const urlAt = (index: number) => `https://cdn.pegada.app/${index}.jpg`;

const urlsOf = (variant: StoryVariantId, count: number) =>
  planStoryPhotos(photos(count), variant).slots.map((slot) => slot.photo.url);

const VARIANTS: StoryVariantId[] = ["dm-aberta", "role-ticket"];

describe("story variant registry", () => {
  it("ships DM aberta as the default composition", () => {
    expect(DEFAULT_STORY_VARIANT).toBe("dm-aberta");
  });

  it("registers exactly the two concept variants", () => {
    expect(Object.keys(STORY_VARIANTS)).toStrictEqual([
      "dm-aberta",
      "role-ticket",
    ]);
  });

  it("has a definition for the default variant", () => {
    expect(STORY_VARIANTS[DEFAULT_STORY_VARIANT]).toBeDefined();
  });

  it("gives every variant a renderable component and a photo budget", () => {
    for (const variant of VARIANTS) {
      expect(STORY_VARIANTS[variant].Component).toBeInstanceOf(Function);
      expect(STORY_VARIANTS[variant].maxPhotos).toBe(4);
    }
  });

  it("keeps the registry's maxPhotos in step with the planner's own cap", () => {
    for (const variant of VARIANTS) {
      expect(STORY_VARIANTS[variant].maxPhotos).toBe(STORY_MAX_PHOTOS[variant]);
    }
  });
});

describe("planStoryPhotos", () => {
  describe.each(VARIANTS)("%s", (variant) => {
    it("reports an empty plan for a dog with no photos", () => {
      const plan = planStoryPhotos([], variant);

      expect(plan.isEmpty).toBe(true);
      expect(plan.slots).toStrictEqual([]);
      expect(plan.mosaicCount).toBe(0);
      expect(plan.variant).toBe(variant);
    });

    it("treats a photo with no usable URL as no photo at all", () => {
      const plan = planStoryPhotos([{ url: "" }, undefined], variant);

      expect(plan.isEmpty).toBe(true);
      expect(plan.slots).toStrictEqual([]);
    });

    it("skips the gaps rather than leaving a blank pane", () => {
      const plan = planStoryPhotos(
        [{ url: urlAt(0) }, { url: "" }, { url: urlAt(1) }],
        variant,
      );

      expect(plan.slots.map((slot) => slot.photo.url)).toStrictEqual([
        urlAt(0),
        urlAt(1),
      ]);
    });

    it.each([1, 2, 3, 4])("places all %i photos, in order", (count) => {
      const plan = planStoryPhotos(photos(count), variant);

      expect(plan.slots).toHaveLength(count);
      expect(plan.isEmpty).toBe(false);
      expect(urlsOf(variant, count)).toStrictEqual(
        photos(count).map((photo) => photo.url),
      );
    });

    it("indexes slots by their position in the dog's photo list", () => {
      const plan = planStoryPhotos(photos(4), variant);

      expect(plan.slots.map((slot) => slot.index)).toStrictEqual([0, 1, 2, 3]);
    });

    it("caps at four photos and drops the tail, not the head", () => {
      const plan = planStoryPhotos(photos(6), variant);

      expect(plan.slots).toHaveLength(4);
      expect(plan.slots.map((slot) => slot.photo.url)).toStrictEqual(
        photos(4).map((photo) => photo.url),
      );
    });

    it("is deterministic — the same photos plan the same way twice", () => {
      expect(planStoryPhotos(photos(3), variant)).toStrictEqual(
        planStoryPhotos(photos(3), variant),
      );
    });

    it.each([1, 2, 3, 4])(
      "tiles %i photos into rects that fill the frame without overlapping",
      (count) => {
        const slots = mosaicSlots(planStoryPhotos(photos(count), variant));
        const area = slots.reduce(
          (total, slot) => total + slot.rect.width * slot.rect.height,
          0,
        );

        expect(area).toBeCloseTo(1, 5);
        for (const { rect } of slots) {
          expect(rect.x).toBeGreaterThanOrEqual(0);
          expect(rect.y).toBeGreaterThanOrEqual(0);
          expect(rect.x + rect.width).toBeLessThanOrEqual(1.0001);
          expect(rect.y + rect.height).toBeLessThanOrEqual(1.0001);
        }
      },
    );
  });

  describe("dm-aberta", () => {
    it.each([1, 2, 3, 4])("tiles the bubble for all %i photos", (count) => {
      const plan = planStoryPhotos(photos(count), "dm-aberta");

      expect(plan.mosaicCount).toBe(count);
      expect(mosaicSlots(plan)).toHaveLength(count);
      expect(stampSlot(plan)).toBeUndefined();
    });

    it("leaves every pane level — they sit inside one clipped bubble", () => {
      const plan = planStoryPhotos(photos(4), "dm-aberta");

      expect(plan.slots.every((slot) => slot.rotate === 0)).toBe(true);
    });

    it("gives a lone photo the whole bubble", () => {
      const plan = planStoryPhotos(photos(1), "dm-aberta");

      expect(plan.slots.map((slot) => slot.rect)).toStrictEqual([
        { x: 0, y: 0, width: 1, height: 1 },
      ]);
    });
  });

  describe("role-ticket", () => {
    it.each([
      [1, 1, false],
      [2, 2, false],
      [3, 2, true],
      [4, 3, true],
    ])(
      "splits %i photos into %i band panes (stamp: %s)",
      (count, bandPanes, hasStamp) => {
        const plan = planStoryPhotos(photos(count), "role-ticket");

        expect(mosaicSlots(plan)).toHaveLength(bandPanes);
        expect(Boolean(stampSlot(plan))).toBe(hasStamp);
      },
    );

    it("sends the photo past the band to the stamp, tilted", () => {
      const stamp = stampSlot(planStoryPhotos(photos(3), "role-ticket"));

      expect(stamp?.photo.url).toBe(urlAt(2));
      expect(stamp?.rotate).not.toBe(0);
    });

    it("keeps the band's own panes level", () => {
      const plan = planStoryPhotos(photos(4), "role-ticket");

      expect(mosaicSlots(plan).every((slot) => slot.rotate === 0)).toBe(true);
    });
  });
});
