import * as WebBrowser from "expo-web-browser";

export const openWebBrowser = async (url: string) => {
  return WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET
  });
};
