// Usage: node scripts/indexnow.mjs [--dry-run] [url ...]
// Without URLs, submits every URL in the sitemap. Run it after a deploy: the
// key file at /<key>.txt must already be live or IndexNow rejects the request.
import sitemap from "../src/app/sitemap.ts";
import { indexNowPayload } from "../src/lib/indexnow.ts";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const urls = args.filter((arg) => !arg.startsWith("--"));

const payload = indexNowPayload(
  urls.length > 0 ? urls : sitemap().map((entry) => entry.url),
);

if (dryRun) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  console.log(res.status, res.statusText);
  if (!res.ok) process.exit(1);
}
