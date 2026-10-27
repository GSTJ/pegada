import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * The home's JSON-LD is read by crawlers and nothing else, so a typo in it
 * fails silently. Imported as TypeScript on purpose, same as store-urls: the
 * builder under test is the one the page renders.
 */
const { homeJsonLd } = await import("../src/lib/structured-data.ts");

const { APP_STORE_URL, PLAY_STORE_URL } =
  await import("../src/app/store/store-urls.ts");

const graphFor = (inLanguage = "en-US") =>
  structuredClone(
    homeJsonLd({
      url: "https://www.pegada.app/",
      inLanguage,
      description: "desc",
      sameAs: [APP_STORE_URL, PLAY_STORE_URL],
    }),
  );

const byType = (graph, type) =>
  graph["@graph"].find((node) => node["@type"] === type);

test("the graph has the app, the site and the organization", () => {
  const graph = graphFor();

  assert.equal(graph["@context"], "https://schema.org");
  for (const type of ["Organization", "WebSite", "MobileApplication"]) {
    assert.ok(byType(graph, type), `missing ${type}`);
  }
});

test("the app and the site point at the organization by @id", () => {
  const graph = graphFor();
  const id = byType(graph, "Organization")["@id"];

  assert.ok(id);
  assert.equal(byType(graph, "MobileApplication").publisher["@id"], id);
  assert.equal(byType(graph, "WebSite").publisher["@id"], id);
});

test("no rating, review or search action anywhere", () => {
  const json = JSON.stringify(graphFor("pt-BR"));

  assert.doesNotMatch(json, /aggregateRating|[Rr]eview|SearchAction/);
});

test("every sameAs and logo is an absolute https url", () => {
  const graph = graphFor();

  for (const node of graph["@graph"]) {
    for (const link of [...(node.sameAs ?? []), node.logo ?? node.url]) {
      assert.equal(new URL(link).protocol, "https:", link);
    }
  }
  assert.ok(byType(graph, "Organization").sameAs.length > 0);
});

test("inLanguage follows the locale it is given", () => {
  assert.equal(byType(graphFor("pt-BR"), "WebSite").inLanguage, "pt-BR");
  assert.equal(byType(graphFor("en-US"), "WebSite").inLanguage, "en-US");
});
