import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [
  typescriptContract,
  swiftContract,
  kotlinContract,
  androidWidget,
  syncService,
  avatarService,
  logoutService,
  androidWidgetInfo,
  androidWidgetPreview,
  androidStrings,
  androidPortugueseStrings,
  englishTranslations,
  portugueseTranslations,
  rootLayout,
] = await Promise.all([
  readFile(new URL("../modules/pegada-widget/index.ts", import.meta.url), "utf8"),
  readFile(new URL("../targets/pegada-widgets/MatchesWidget.swift", import.meta.url), "utf8"),
  readFile(
    new URL(
      "../modules/pegada-widget/android/src/main/java/app/pegada/widget/WidgetSnapshot.kt",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL(
      "../modules/pegada-widget/android/src/main/java/app/pegada/widget/MatchesWidget.kt",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(new URL("../src/services/matchesWidget/index.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/services/matchesWidget/avatars.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/services/logout.ts", import.meta.url), "utf8"),
  readFile(
    new URL(
      "../modules/pegada-widget/android/src/main/res/xml/pegada_matches_widget_info.xml",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL(
      "../modules/pegada-widget/android/src/main/res/layout/pegada_widget_preview.xml",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL("../modules/pegada-widget/android/src/main/res/values/strings.xml", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL(
      "../modules/pegada-widget/android/src/main/res/values-pt-rBR/strings.xml",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL("../../../packages/shared/i18n/locales/en/translation.json", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../../../packages/shared/i18n/locales/pt-BR/translation.json", import.meta.url),
    "utf8",
  ),
  readFile(new URL("../src/app/_layout.tsx", import.meta.url), "utf8"),
]);

const englishWidgetCopy = JSON.parse(englishTranslations).widget;
const portugueseWidgetCopy = JSON.parse(portugueseTranslations).widget;
const widgetCopyKeys = [
  "matchesReadyToChat",
  "matchesReadyToChat_plural",
  "replyTo",
  "sayHiTo",
  "caughtUp",
  "findMoreDogs",
  "findDogs",
  "noMatchesYet",
  "signIn",
  "seeYourMatches",
];

for (const key of widgetCopyKeys) {
  assert.equal(typeof englishWidgetCopy[key], "string");
  assert.equal(typeof portugueseWidgetCopy[key], "string");
}

const states = [
  ["attention", "attention", "ATTENTION"],
  ["caughtUp", "caughtUp", "CAUGHT_UP"],
  ["noMatches", "noMatches", "NO_MATCHES"],
  ["signedOut", "signedOut", "SIGNED_OUT"],
];

for (const [wireValue, swiftCase, kotlinCase] of states) {
  assert.match(typescriptContract, new RegExp(`"${wireValue}"`));
  assert.match(swiftContract, new RegExp(`case ${swiftCase}`));
  assert.match(kotlinContract, new RegExp(`${kotlinCase}\\("${wireValue}"\\)`));
}

for (const field of ["primary", "secondary"]) {
  assert.match(typescriptContract, new RegExp(`${field}: string`));
  assert.match(swiftContract, new RegExp(`let ${field}: String\\?`));
  assert.match(kotlinContract, new RegExp(`val ${field}: String\\?`));
}

assert.match(swiftContract, /Link\(destination:/);
assert.match(swiftContract, /pegada:\/\/\/chat\//);
assert.match(swiftContract, /widgetAccentedRenderingMode\(\.fullColor\)/);
assert.match(swiftContract, /widgetAccentable\(\)/);
assert.match(androidWidget, /usesPerDogTargets/);
assert.match(androidWidget, /modifier\.clickable\(actionStartActivity\(openIntent/);
assert.match(androidWidget, /pegada:\/\/\/chat\//);
assert.match(androidWidgetInfo, /android:previewLayout="@layout\/pegada_widget_preview"/);
assert.match(androidWidgetPreview, /@string\/pegada_widget_preview_primary/);
assert.match(androidWidgetPreview, /@string\/pegada_widget_preview_secondary/);
for (const androidCopy of [androidStrings, androidPortugueseStrings]) {
  assert.match(androidCopy, /name="pegada_widget_preview_primary"/);
  assert.match(androidCopy, /name="pegada_widget_preview_secondary"/);
}
assert.match(syncService, /widgetSyncCoordinator\.enqueueSignedIn/);
assert.match(syncService, /widgetSyncCoordinator\.enqueueSignedOut/);
assert.match(rootLayout, /lastHandledInitialRouteRef\.current !== initialRouteName/);
assert.ok(
  rootLayout.indexOf("lastHandledInitialRouteRef.current = initialRouteName") <
    rootLayout.indexOf("router.replace(initialRouteName)"),
);
assert.ok(avatarService.indexOf("if (!isLatest())") < avatarService.indexOf("directory.list()"));
assert.ok(
  logoutService.indexOf("invalidateMatchesWidgetSignedInWork()") <
    logoutService.indexOf("deleteData(StorageKeys.Token)"),
);
assert.ok(
  logoutService.indexOf("queryClient.clear()") < logoutService.indexOf("payments.logOut()"),
);

process.stdout.write("widget cross-platform contract harness: PASS\n");
