import * as WebBrowser from "expo-web-browser";

/**
 * Opens an external URL in an in-app browser.
 *
 * Why no `presentationStyle`?
 *   `WebBrowserPresentationStyle.PAGE_SHEET` ships with a long-standing
 *   `expo-web-browser` defect on iOS where the SFSafariViewController
 *   nested inside the page-sheet modal frequently renders an empty white
 *   surface for several seconds (and sometimes never recovers) — even
 *   though the underlying URL loads and returns 200. The Maestro
 *   `24-profile-journey` validator caught this on the Terms of Use row.
 *
 *   The default presentation (full-screen SFSafariViewController on iOS,
 *   Chrome Custom Tabs on Android) renders content reliably and is what
 *   Apple recommends for Terms / Privacy hand-offs. Users dismiss with
 *   the standard "Done" chrome on iOS or system back on Android.
 */
export const openWebBrowser = async (url: string) => {
  return WebBrowser.openBrowserAsync(url);
};
