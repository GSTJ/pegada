/**
 * The same screen as `app/dog/[id].tsx`, mounted a second time under the
 * pt-BR locale prefix.
 *
 * The web app runs next-intl with `localePrefix: "as-needed"`, so a browser
 * sending `Accept-Language: pt-BR` gets a 307 from `/dog/<id>` to
 * `/pt-br/dog/<id>` -- which means `/pt-br/dog/<id>` is the URL a Brazilian
 * user actually copies out of the address bar and shares. iOS claims it
 * (see the AASA route in apps/nextjs) and Android's intent filters claim it
 * too, so without a route at this exact path the app would open the link
 * onto expo-router's "Unmatched Route" screen.
 *
 * Only the non-default locale needs a file: `/en-us/dog/<id>` is redirected
 * back to the unprefixed `/dog/<id>` by the same next-intl config, so it is
 * never a shareable URL. If a third locale is ever added, the AASA
 * consistency test in apps/nextjs/tests fails until it gets a sibling of
 * this file.
 */
export { default } from "@/app/dog/[id]";
