import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * The defect under test: with GOOGLE_SERVICES_JSON unset — every checkout
 * that is not CI — the old package.json one-liner wrote a ZERO-BYTE
 * google-services.json. Expo copies it into the native project and
 * :app:processReleaseGoogleServices fails the Android build with "Malformed
 * root json". So "the file exists" is not the assertion; "the file parses"
 * is.
 */

const APP_DIR = path.resolve(__dirname, "..");
const SCRIPT = path.join(APP_DIR, "scripts", "setup-secret-files.sh");

/** A throwaway APP_DIR holding only the committed stubs, so the real (and
 * gitignored, possibly real-credential) files are never read or written. */
function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pegada-secret-files-"));
  for (const stub of [
    "google-services.stub.json",
    "GoogleService-Info.stub.plist",
  ]) {
    fs.copyFileSync(path.join(APP_DIR, stub), path.join(dir, stub));
  }
  return dir;
}

function run(dir: string, env: Record<string, string> = {}) {
  return execFileSync("/bin/bash", [SCRIPT], {
    // A fixed, minimal environment rather than the ambient one: the whole
    // point is what the script does when GOOGLE_SERVICES_JSON is unset, and
    // on a machine that has it exported the test would silently pass for the
    // wrong reason. PATH is just enough for the `cp` the script shells out to.
    env: {
      NODE_ENV: "test",
      PATH: "/usr/bin:/bin",
      APP_DIR: dir,
      ...env,
    },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

describe("setup:secret:files", () => {
  let dir: string;

  beforeEach(() => {
    dir = makeSandbox();
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("writes a google-services.json that parses when the secret is unset", () => {
    run(dir);

    const written = fs.readFileSync(
      path.join(dir, "google-services.json"),
      "utf8",
    );

    expect(written.length).toBeGreaterThan(0);
    // The assertion the build makes. `JSON.parse("")` throws, which is the
    // "Malformed root json" the Gradle task reported.
    expect(() => JSON.parse(written)).not.toThrow();
    expect(JSON.parse(written)).toHaveProperty("project_info.project_id");
  });

  it("writes a GoogleService-Info.plist that is not empty when the secret is unset", () => {
    run(dir);

    const written = fs.readFileSync(
      path.join(dir, "GoogleService-Info.plist"),
      "utf8",
    );

    expect(written).toContain("<key>BUNDLE_ID</key>");
  });

  it("prefers the secret over the stub", () => {
    run(dir, {
      GOOGLE_SERVICES_JSON: '{"project_info":{"project_id":"from-the-secret"}}',
    });

    const written = JSON.parse(
      fs.readFileSync(path.join(dir, "google-services.json"), "utf8"),
    ) as { project_info: { project_id: string } };

    expect(written.project_info.project_id).toBe("from-the-secret");
  });

  it("leaves a file that is already there alone", () => {
    const target = path.join(dir, "google-services.json");
    fs.writeFileSync(target, '{"project_info":{"project_id":"already-here"}}');

    run(dir, { GOOGLE_SERVICES_JSON: '{"project_info":{}}' });

    expect(fs.readFileSync(target, "utf8")).toContain("already-here");
  });
});
