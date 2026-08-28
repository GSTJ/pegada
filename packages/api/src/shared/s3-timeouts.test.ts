import type { NodeHttpHandlerOptions } from "@smithy/node-http-handler";

import { S3Client } from "@aws-sdk/client-s3";

import { client, S3_REQUEST_TIMEOUTS } from "./file-upload";

/**
 * The defect: both S3 clients were constructed with no request handler, so
 * both of the SDK's timeouts came out `undefined`, which NodeHttpHandler
 * treats as "wait forever". Point AWS_S3_ENDPOINT at an address that accepts
 * packets and never answers — `10.0.2.2:9002` from the host is the recurring
 * one — and `dog.create`'s copy out of dogs-temporary/ never returns: no
 * error, no timeout, nothing logged, Create Profile spinning until the app is
 * killed.
 *
 * This asserts the configuration rather than driving a socket, because the
 * SDK cannot complete a real request under this jest setup at all: its HTTP
 * handler is loaded by dynamic import and jest without
 * --experimental-vm-modules rejects every send in ~40ms with
 * ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG. A socket test here would go
 * green on that error and prove nothing. Verified out-of-band with plain
 * node: an S3Client with no requestHandler, pointed at a TCP server that
 * accepts and never replies, was still outstanding after 5 minutes.
 */

/**
 * `configProvider` is private and `httpHandlerConfigs()` — the public reader —
 * returns `{}` until the handler has served a request, which it cannot do
 * here. So this reaches for the private field, deliberately and in one place.
 */
const resolveTimeouts = (s3: S3Client) =>
  (
    s3.config.requestHandler as unknown as {
      configProvider: Promise<NodeHttpHandlerOptions>;
    }
  ).configProvider;

describe("S3 request timeouts", () => {
  it("are set on the client the app actually uses", async () => {
    const resolved = await resolveTimeouts(client);

    expect(resolved.connectionTimeout).toBe(
      S3_REQUEST_TIMEOUTS.connectionTimeout,
    );
    expect(resolved.requestTimeout).toBe(S3_REQUEST_TIMEOUTS.requestTimeout);
  });

  it("are finite and positive, which is the whole point", () => {
    expect(S3_REQUEST_TIMEOUTS.connectionTimeout).toBeGreaterThan(0);
    expect(S3_REQUEST_TIMEOUTS.requestTimeout).toBeGreaterThan(0);
  });

  it("is not what an unconfigured client gets", async () => {
    // The pre-fix construction, kept as the contrast: this is what every
    // request to object storage was running under.
    const unconfigured = new S3Client({
      region: "us-east-1",
      credentials: { accessKeyId: "k", secretAccessKey: "s" },
    });
    const resolved = await resolveTimeouts(unconfigured);

    expect(resolved.connectionTimeout).toBeUndefined();
    expect(resolved.requestTimeout).toBeUndefined();
  });
});
