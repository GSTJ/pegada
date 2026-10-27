import en from "@pegada/shared/i18n/locales/en/web.json";
import ptBr from "@pegada/shared/i18n/locales/pt-BR/web.json";

import { buildLlmsFullTxt } from "@/lib/llms";

// `/llms-full.txt` falls under the `[locale]` dynamic segment, so without this
// file the request renders a page instead of a plain text file.
export const dynamic = "force-static";

export const GET = () =>
  new Response(buildLlmsFullTxt({ "en-us": en, "pt-br": ptBr }), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
