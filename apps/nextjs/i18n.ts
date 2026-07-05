import { getRequestConfig } from "next-intl/server";

import { Language } from "@pegada/shared/i18n/types/types";

export default getRequestConfig(() => ({
  locale: Language.Default.toLowerCase(),
  messages: {},
}));
