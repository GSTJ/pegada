import { Language } from "@pegada/shared/i18n/types/types";
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(() => ({
  locale: Language.Default.toLowerCase(),
  messages: {},
}));
