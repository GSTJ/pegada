import { redirect } from "next/navigation";

const WEBSITE_URL = "https://www.pegada.app/";
const APP_STORE_URL = "https://apps.apple.com/br/app/pegada/id6450865592";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=app.pegada";

export const GET = async (request: Request) => {
  const userAgent = request.headers.get("user-agent") ?? "";

  // Redirect to the App Store for iOS devices
  if (/iPhone|iPad|iPod|WatchOS/i.test(userAgent)) {
    return redirect(APP_STORE_URL);
  }

  // Redirect to Google Play Store for Android devices
  if (/Android/i.test(userAgent)) {
    return redirect(PLAY_STORE_URL);
  }

  // Redirect to the website or web app for all other devices
  return redirect(WEBSITE_URL);
};
