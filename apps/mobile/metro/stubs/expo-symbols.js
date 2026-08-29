/**
 * Build-time stub for `expo-symbols`, wired up in metro.config.js.
 *
 * Why
 * ---
 * `expo-router` depends on `expo-symbols` for its NativeTabs API. Its
 * `native-tabs/NativeTabTrigger` imports `utils/materialIconConverter`, which
 * on Android imports `expo-symbols`, which imports
 * `@expo-google-fonts/material-symbols` — and that package's index re-exports
 * all SEVEN weights. Metro follows the whole chain, so the release APK shipped
 * 6.78 MB of Material Symbols TTFs (3.19 MB compressed, 5.4 % of the download)
 * as `res/raw/` entries, plus a 108.9 KB `symbols.json` in the JS bundle.
 *
 * This app never uses NativeTabs. `app/(app)/(tabs)/_layout.tsx` uses
 * expo-router's JS `Tabs` with the app's own SVG icons, and `NativeTabs` /
 * `NativeTabTrigger` / `SymbolView` appear nowhere in `src`.
 *
 * On Android `expo-symbols` is pure JavaScript — a `<Text>` in a Material
 * Symbols font — so there is no native module to exclude from autolinking. The
 * only way to drop the fonts is to cut the import chain, which is what this
 * does.
 *
 * Safety
 * ------
 * The module body is inert. Both exports throw only when *reached*, and the
 * only thing that can reach them is a `<NativeTabTrigger md="..." />`, which
 * this app does not render. If NativeTabs is ever adopted, the failure is a
 * loud message pointing here rather than a missing glyph.
 */
const message =
  "expo-symbols is stubbed out in apps/mobile/metro/stubs/expo-symbols.js " +
  "because this app does not use expo-router's NativeTabs, and pulling it in " +
  "costs 3.19 MB of Material Symbols fonts in the Android APK. If you are " +
  "adopting NativeTabs, remove the resolveRequest entry in metro.config.js.";

export const SymbolView = () => {
  throw new Error(message);
};

export const unstable_getMaterialSymbolSourceAsync = () => {
  throw new Error(message);
};
