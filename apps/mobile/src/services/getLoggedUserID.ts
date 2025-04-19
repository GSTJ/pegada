// Necessary for jwt-decode to work with react-native
import "@react-native-anywhere/polyfill-base64";

import { jwtDecode } from "jwt-decode";

import { getData, StorageKeys } from "./storage";

export const getLoggedUserID = async () => {
  const token = await getData(StorageKeys.Token);

  if (!token) return;

  const payload = jwtDecode<{ id?: string; sub?: string }>(token);

  const userId = payload.sub ?? payload.id;
  if (!userId) return;

  return userId;
};
