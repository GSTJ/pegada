import {
  openBrowserAsync,
  WebBrowserPresentationStyle
} from "expo-web-browser";

export const openWebBrowser = async (url: string) => {
  await openBrowserAsync(url, {
    presentationStyle: WebBrowserPresentationStyle.PAGE_SHEET
  });
};
