import en from "@pegada/shared/i18n/locales/en/web.json";
import ptBr from "@pegada/shared/i18n/locales/pt-BR/web.json";

import { APP_STORE_URL, PLAY_STORE_URL } from "@/app/store/store-urls";
import { buildLlmsTxt } from "@/lib/llms";

// `/llms.txt` falls under the `[locale]` dynamic segment, so without this
// file the request renders a page instead of a plain text file.
export const dynamic = "force-static";

export const GET = () =>
  new Response(
    buildLlmsTxt(
      { "en-us": en, "pt-br": ptBr },
      { appStore: APP_STORE_URL, playStore: PLAY_STORE_URL },
    ),
    {
      headers: { "content-type": "text/plain; charset=utf-8" },
    },
  );
