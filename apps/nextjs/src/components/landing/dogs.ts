import type { BreedSlug } from "@pegada/shared/i18n/i18n";

/** Copy in both site locales, keyed by the route segment `getSafeLocale()` returns. */
export type LocalizedText = { "en-us": string; "pt-br": string };

export const inLocale = (text: LocalizedText, locale: string) =>
  text[locale as keyof LocalizedText] ?? text["en-us"];

export type Dog = {
  id: string;
  name: string;
  age: LocalizedText;
  /** Rounded like the app's distance pill. Absent when no capture shows one. */
  km?: number;
  /** As the owner wrote it in the app. Absent when no capture shows one. */
  bio?: LocalizedText;
  /**
   * Only when the photo plainly matches. The seed labels every Maestro dog a
   * Golden Retriever, and an ID card with the wrong breed is the one thing a
   * dog person spots first.
   */
  breed?: BreedSlug;
  alt: LocalizedText;
  /** 720x1028, 2x the widest deck card. AVIF first, WebP for the rest. */
  photo: { avif: string; webp: string; width: number; height: number };
};

const photo = (id: string) => ({
  avif: `/landing/dogs/${id}.avif`,
  webp: `/landing/dogs/${id}.webp`,
  width: 720,
  height: 1028,
});

/**
 * The dogs in Pegada's own screenshots (`public/screens`, the old hero
 * mockup), with the copy their cards show. The pt-BR text is what the app
 * rendered; the en-us text is a translation of it.
 */
export const DOGS = {
  lua: {
    id: "lua",
    name: "Lua",
    age: { "en-us": "3 years", "pt-br": "3 anos" },
    km: 3,
    bio: {
      "en-us":
        "I love playing fetch and stealing socks! Looking for someone to play and have fun with! 🐶",
      "pt-br":
        "Adoro brincar de pegar e roubar meias! Procurando alguém para brincar e se divertir! 🐶",
    },
    breed: "border-collie",
    alt: {
      "en-us":
        "Lua, a black and white border collie, running with a yellow ball in her mouth.",
      "pt-br":
        "Lua, uma border collie preta e branca, correndo com uma bolinha amarela na boca.",
    },
    photo: photo("lua"),
  },
  nina: {
    id: "nina",
    name: "Nina",
    age: { "en-us": "2 years", "pt-br": "2 anos" },
    bio: {
      "en-us": "Chases anything that flies. Ball, leaf, little bird.",
      "pt-br": "Corre atrás de tudo que voa. Bola, folha, passarinho.",
    },
    alt: {
      "en-us":
        "Nina, a grey dog with pale blue eyes, looking straight at the camera.",
      "pt-br":
        "Nina, uma cachorra cinza de olhos azul-claros, olhando direto pra câmera.",
    },
    photo: photo("nina"),
  },
  maui: {
    id: "maui",
    name: "Maui",
    age: { "en-us": "1 year and 7 months", "pt-br": "1 ano e 7 meses" },
    km: 246,
    breed: "golden-retriever",
    alt: {
      "en-us": "Maui, a golden retriever, smiling with his tongue out.",
      "pt-br": "Maui, um golden retriever, sorrindo com a língua de fora.",
    },
    photo: photo("maui"),
  },
} satisfies Record<string, Dog>;

/** Deck order: the app sorts by distance, so the closest dog leads. */
export const DECK: Dog[] = [DOGS.lua, DOGS.nina, DOGS.maui];
