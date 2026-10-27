import type en from "@pegada/shared/i18n/locales/en/web.json";

type Web = typeof en;

// Keep in sync with `sitemap.ts`: same locales, same default-locale rule.
const LOCALES = ["en-us", "pt-br"] as const;
export type LlmsLocale = (typeof LOCALES)[number];
export type WebResources = Record<LlmsLocale, Web>;

const BASE_URL = "https://www.pegada.app";

const LANGUAGE_NAME = { "en-us": "English", "pt-br": "Português" } as const;

/** The path of a page in a locale; `localePrefix` is `as-needed`, so en-us has none. */
const urlFor = (locale: LlmsLocale, page: string) => {
  const prefix = locale === "en-us" ? "" : `/${locale}`;

  return `${BASE_URL}${page ? `${prefix}/${page}` : prefix || "/"}`;
};

/** Drops the inline tags the copy carries (`<b>`, `<mail>`, `<kbd>`), keeping their text. */
const plain = (text: string) => text.replaceAll(/<\/?[a-z]+>/g, "");

/**
 * The indexable pages only: `terms-of-use` and `delete-account` are noindex,
 * so they stay out of both files.
 */
const pages = (web: Web) => [
  { path: "", ...web.metadata },
  { path: "story", ...web.story.metadata },
  { path: "privacy-policy", ...web.privacyPolicy.metadata },
];

/** `/llms.txt`: what Pegada is and where each answer lives (llmstxt.org). */
export const buildLlmsTxt = (
  web: WebResources,
  stores: { appStore: string; playStore: string },
) =>
  [
    "# Pegada",
    "",
    `> ${web["en-us"].metadata.description} Made by Gabriel Taveira.`,
    "",
    ...LOCALES.flatMap((locale) => [
      `## ${LANGUAGE_NAME[locale]}`,
      "",
      ...pages(web[locale]).map(
        (page) =>
          `- [${page.title}](${urlFor(locale, page.path)}): ${page.description}`,
      ),
      "",
    ]),
    "## App",
    "",
    `- [Pegada on the App Store](${stores.appStore})`,
    `- [Pegada on Google Play](${stores.playStore})`,
    "",
  ].join("\n");

const section = (title: string, ...body: string[]) =>
  [`#### ${plain(title)}`, "", ...body.map((text) => `${plain(text)}\n`)].join(
    "\n",
  );

const list = (entries: [string, string][]) =>
  entries.map(([key, value]) => `- ${key}: ${value}`).join("\n");

/** The `<name>Key` / `<name>Value` pairs the landing copy uses for its fact lists. */
const facts = (copy: Record<string, string>, names: string[]) =>
  list(
    names.map((name) => [copy[`${name}Key`] ?? "", copy[`${name}Value`] ?? ""]),
  );

const landing = ({ landing: l }: Web) => [
  `### ${l.hero.title}\n\n${l.hero.lede}\n`,
  section(
    l.profile.title,
    l.profile.desc,
    facts(l.profile, ["photos", "name", "birthday", "breed", "bio"]),
    l.profile.fine,
  ),
  section(
    l.deck.title,
    l.deck.desc,
    list([
      [l.deck.like, l.deck.likeDesc],
      [l.deck.nope, l.deck.nopeDesc],
      [l.deck.maybe, l.deck.maybeDesc],
    ]),
  ),
  section(
    l.radius.title,
    l.radius.desc,
    facts(l.radius, ["breed", "size", "color", "age"]),
    l.radius.fine,
  ),
  section(
    l.chat.title,
    l.chat.desc,
    facts(l.chat, ["onlyAfter", "unmatch", "report"]),
  ),
  section(l.story.title, l.story.desc, l.story.note),
  section(l.faq.title, l.faq.desc),
  ...([1, 2, 3, 4, 5, 6, 7] as const).map((n) =>
    section(l.faq[`q${n}`], l.faq[`a${n}`]),
  ),
  section(l.closing.title, l.closing.desc),
];

const storyPage = ({ story: s }: Web) => [
  `### ${s.headline}\n\n${s.subline}\n`,
  section(
    s.howItWorks.title,
    list([
      ["1", s.howItWorks.app],
      ["2", s.howItWorks.photos],
      ["3", s.howItWorks.post],
    ]),
  ),
];

/** `/llms-full.txt`: the copy the pages render, read from the same i18n resources. */
export const buildLlmsFullTxt = (web: WebResources) =>
  [
    "# Pegada",
    "",
    ...LOCALES.flatMap((locale) => [
      `## ${LANGUAGE_NAME[locale]} (${urlFor(locale, "")})`,
      "",
      ...landing(web[locale]),
      ...storyPage(web[locale]),
      `${web[locale].privacyPolicy.content.trim()}\n`,
    ]),
  ].join("\n");
