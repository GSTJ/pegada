/**
 * Post-check for flow 45 (dog-profile-photo-edges.yaml).
 *
 * The bug is only on screen while a spring runs — about a third of a second —
 * and it is a rendering fault, not a tree fault: every node stays exactly
 * where it was, the pixels just stop arriving. So this measures the frame
 * buffer, like checks/33 and 38 do, and it has to catch it mid-gesture.
 *
 * Aiming a ~0.5s screenshot at a ~0.33s window is not a thing, so it does the
 * opposite: it starts a fragment that taps ten times in a row and samples the
 * screen continuously while that runs. On the broken build 6 of 40 samples
 * came back with half the card as pure #000000, so a couple of dozen samples
 * per position is a wide margin.
 *
 * Three positions, because "which photo" is the part of the report that had to
 * be checked: the first (paging back off the start), a middle one (an ordinary
 * photo swap, no spring at all), and the last (paging forward off the end,
 * which is what was reported).
 *
 * Platform-agnostic: `captureScreen` reads simctl's BMP or adb's raw
 * framebuffer. Only ever run against iOS so far; Android is pending a device.
 */

import { spawn } from "node:child_process";
import { once } from "node:events";

import { driveFragment } from "./lib/chat-geometry.mjs";
import { resolveDevice } from "./lib/device.mjs";
import { readHierarchy } from "./lib/hierarchy.mjs";
import { fail, pass } from "./lib/report.mjs";
import { boundingBox, captureScreen } from "./lib/screen.mjs";

const TAG = "check-45";

/**
 * Pure black. Not "dark": a photograph's shadows are never all three channels
 * at zero once it has been through JPEG, and the thing being detected is a
 * region where nothing was drawn at all, so the backdrop shows through.
 */
const isPureBlack = ([r, g, b]) => r <= 8 && g <= 8 && b <= 8;

/**
 * Share of the card that may be pure black before this is a fault. The bug
 * paints 49.7%; a photo that happens to be very dark will not reach 3%.
 */
const MAX_BLACK_SHARE = 0.03;

/** How long to keep sampling while a fragment runs. */
const SAMPLE_BUDGET_MS = 25_000;

const device = resolveDevice();

/** The card's rect in framebuffer pixels. */
const cardRegion = () => {
  const { byTestId, screen } = readHierarchy({ device });
  const card = byTestId.get("swipe-card");
  if (!card) {
    fail(
      TAG,
      "`swipe-card` is not in the tree — flow 45 did not park on a dog profile",
    );
  }

  const frame = captureScreen({ device });
  // The hierarchy is in points and the frame buffer is in pixels.
  const scale = frame.width / screen.width;

  return {
    frame,
    scale,
    region: {
      x: Math.max(0, Math.round(card.x * scale)),
      y: Math.max(0, Math.round(card.y * scale)),
      right: Math.min(frame.width, Math.round(card.right * scale)),
      bottom: Math.min(frame.height, Math.round(card.bottom * scale)),
    },
  };
};

const { scale, region } = cardRegion();
const area = (region.right - region.x) * (region.bottom - region.y);
console.log(
  `[${TAG}] card ${region.x},${region.y}..${region.right},${region.bottom} px (scale ${scale.toFixed(2)}), ${area} px²`,
);

const blackShare = (frame) => {
  const box = boundingBox(frame, isPureBlack, region);
  return { share: (box?.count ?? 0) / area, box };
};

/** The worst frame seen while `fragment` runs. */
const worstDuring = async (fragment) => {
  const url = new URL(`lib/${fragment}.yaml`, import.meta.url);
  const child = spawn(
    "maestro",
    [
      "--device",
      device.id,
      "test",
      "-e",
      `APP_ID=${process.env.APP_ID ?? "app.pegada"}`,
      url.pathname,
    ],
    { stdio: "ignore" },
  );

  let running = true;
  child.on("exit", () => {
    running = false;
  });

  const deadline = Date.now() + SAMPLE_BUDGET_MS;
  let worst = { share: 0, box: null };
  let samples = 0;

  // `captureScreen` shells out synchronously, so the loop yields between
  // captures — without that the event loop never runs and the child's `exit`
  // never lands, and this would sample for the whole budget every time.
  // oxlint-disable-next-line no-unmodified-loop-condition -- `running` is set by the child's `exit` handler, which is exactly what the `await` at the bottom of the body exists to let run.
  while (running && Date.now() < deadline) {
    const current = blackShare(captureScreen({ device }));
    samples += 1;
    if (current.share > worst.share) worst = current;
    // oxlint-disable-next-line no-await-in-loop -- sequential is the point: this samples the screen over time while a child process taps, it is not a batch of independent promises.
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }

  if (running) await once(child, "exit");

  return { ...worst, samples };
};

const verdicts = [];

const measure = async (label, fragment) => {
  const { share, box, samples } = await worstDuring(fragment);
  const line = `${label}: worst ${(share * 100).toFixed(2)}% pure black over ${samples} samples`;
  console.log(
    `[${TAG}] ${line}${box ? ` (bbox ${box.width}x${box.height}+${box.x}+${box.y})` : ""}`,
  );
  verdicts.push({ label, share, box, line });
};

// Photo 1 of 4 — paging BACK off the start, which runs the same spring.
await measure("first photo, paging back", "card-tap-back");

// An ordinary photo swap in the middle of the carousel: no spring, but the
// report was about a photo position, so every position gets measured.
driveFragment("card-next-photo");
await measure("middle photo, paging forward", "card-next-photo");

// Photo 4 of 4 — the reported gesture.
driveFragment("card-next-photo");
driveFragment("card-next-photo");
await measure("last photo, paging forward", "card-tap-forward");

// And the settled state afterwards, which is the "end state" half of the
// evidence: whatever the spring did, the card has to be whole once it stops.
const settled = blackShare(captureScreen({ device }));
console.log(
  `[${TAG}] settled after the last gesture: ${(settled.share * 100).toFixed(2)}% pure black`,
);
verdicts.push({
  label: "settled end state",
  share: settled.share,
  box: settled.box,
  line: `settled end state: ${(settled.share * 100).toFixed(2)}% pure black`,
});

const bad = verdicts.filter((verdict) => verdict.share > MAX_BLACK_SHARE);
if (bad.length > 0) {
  fail(
    TAG,
    `the card blacked out. ${bad
      .map(
        (verdict) =>
          `${verdict.line}${verdict.box ? ` at ${verdict.box.width}x${verdict.box.height}+${verdict.box.x}+${verdict.box.y}` : ""}`,
      )
      .join("; ")}`,
  );
}

pass(
  TAG,
  `the card stayed whole at every photo position — ${verdicts
    .map((verdict) => `${verdict.label} ${(verdict.share * 100).toFixed(2)}%`)
    .join(", ")}, all under ${(MAX_BLACK_SHARE * 100).toFixed(0)}%`,
);
