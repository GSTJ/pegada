// IndexNow ownership key. Search engines fetch `/<key>.txt` (served from
// `public/`) and expect the key as the body. Keep in sync with that file.
export const INDEXNOW_KEY = "ea7a6814720f99b498de2e526c2563f1";

export const INDEXNOW_HOST = "www.pegada.app";

export const indexNowPayload = (urls: string[]) => ({
  host: INDEXNOW_HOST,
  key: INDEXNOW_KEY,
  keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
  urlList: urls.filter((url) => url.startsWith(`https://${INDEXNOW_HOST}/`)),
});
