const fs = require("fs");
const path = require("path");

const mobileRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(mobileRoot, "../..");
const swiftSource = fs.readFileSync(path.join(__dirname, "PegadaAppIntents.swift"), "utf8");
const phrasesByLocale = JSON.parse(
  fs.readFileSync(path.join(__dirname, "appShortcutsPhrases.json"), "utf8"),
);

const locales = ["en", "pt-BR"];
const failures = [];

/** @type {string[]} */
const extractedSourcePhraseKeys = [];
for (const match of swiftSource.matchAll(/^\s*"([^"\n]*\\\(\.applicationName\)[^"\n]*)",?$/gm)) {
  const phrase = match[1];
  if (typeof phrase === "string") {
    extractedSourcePhraseKeys.push(phrase.replace("\\(.applicationName)", "${applicationName}"));
  }
}
// oxlint-disable-next-line unicorn/no-array-sort -- ES2023 toSorted is outside the mobile TS lib
const sourcePhraseKeys = [...extractedSourcePhraseKeys].sort();

if (sourcePhraseKeys.length === 0) {
  failures.push("No App Shortcut phrases were found in PegadaAppIntents.swift");
}

/** @type {string[]} */
const localizedResourceKeys = [];
for (const match of swiftSource.matchAll(
  /LocalizedStringResource\(\s*\n?\s*"(appIntents_[^"]+)"/g,
)) {
  const key = match[1];
  if (typeof key === "string") {
    localizedResourceKeys.push(key);
  }
}

for (const locale of locales) {
  const phrases = phrasesByLocale[locale];
  if (!phrases || typeof phrases !== "object" || Array.isArray(phrases)) {
    failures.push(`Missing phrase map for ${locale}`);
    continue;
  }

  // oxlint-disable-next-line unicorn/no-array-sort -- ES2023 toSorted is outside the mobile TS lib
  const localizedPhraseKeys = Object.keys(phrases).sort();
  if (JSON.stringify(localizedPhraseKeys) !== JSON.stringify(sourcePhraseKeys)) {
    failures.push(
      `${locale} AppShortcuts.strings keys do not exactly match the Swift phrases:\n` +
        `  Swift: ${sourcePhraseKeys.join(" | ")}\n` +
        `  ${locale}: ${localizedPhraseKeys.join(" | ")}`,
    );
  }

  for (const [key, value] of Object.entries(phrases)) {
    if (!key.includes("${applicationName}") || !value.includes("${applicationName}")) {
      failures.push(`${locale} phrase must preserve \${applicationName}: ${key}`);
    }
  }

  const nativeStringsPath = path.join(
    repositoryRoot,
    "packages/shared/i18n/locales",
    locale,
    "native.json",
  );
  const nativeStrings = JSON.parse(fs.readFileSync(nativeStringsPath, "utf8"));
  const localizedStrings = nativeStrings.ios?.["Localizable.strings"] ?? {};

  for (const key of localizedResourceKeys) {
    if (typeof localizedStrings[key] !== "string" || localizedStrings[key].trim() === "") {
      failures.push(`${locale} is missing a non-empty Localizable.strings value for ${key}`);
    }
  }
}

for (const route of ["swipe", "messages"]) {
  const routePath = path.join(mobileRoot, "src/app/(app)/(tabs)", `${route}.ts`);
  if (!fs.existsSync(routePath)) {
    failures.push(`App Intent deep-link route does not exist: ${routePath}`);
  }
}

if (!swiftSource.includes("static let supportedModes: IntentModes = .foreground")) {
  failures.push("App Intents must declare the iOS 26 foreground execution mode");
}

if (failures.length > 0) {
  process.stderr.write(`App Intents verification failed:\n- ${failures.join("\n- ")}\n`);
  process.exit(1);
}

process.stdout.write("App Intents source, routes, and en/pt-BR localizations are in sync.\n");
