import { MAX_PROFILE_IMAGES } from "@pegada/shared/schemas/dog-schema";

import { config } from "./config";
import { dogInputSchema } from "./dog-input-schema";

/**
 * .env.test leaves R2 and AWS_S3_ENDPOINT unset, so the only allowed origin
 * is the legacy virtual-hosted bucket.
 */
const BUCKET_URL = `https://${config.AWS_S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com`;

const dogWithImage = (url: string) => ({
  name: "Rex",
  bio: "",
  gender: "MALE" as const,
  images: [{ url, position: 0 }],
});

const parse = (url: string) => dogInputSchema.safeParse(dogWithImage(url));

describe("dogInputSchema images", () => {
  it("accepts a URL on the configured bucket", () => {
    expect(parse(`${BUCKET_URL}/dogs-temporary/1712345678`).success).toBe(true);
  });

  it("rejects an arbitrary external host", () => {
    const result = parse("https://example.com/payload.png");

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["images", 0, "url"]);
  });

  it("rejects loopback and private addresses", () => {
    expect(parse("http://localhost:9002/pegada-dev/dogs/1").success).toBe(
      false,
    );
    expect(parse("http://127.0.0.1:9002/pegada-dev/dogs/1").success).toBe(
      false,
    );
    expect(parse("http://10.0.0.5/dogs/1").success).toBe(false);
    expect(parse("http://169.254.169.254/latest/meta-data/").success).toBe(
      false,
    );
  });

  it("rejects a host that only contains the bucket host as a substring", () => {
    expect(parse(`${BUCKET_URL}.example.com/dogs/1`).success).toBe(false);
    expect(
      parse(`https://example.com${BUCKET_URL.replace("https://", "/")}/dogs/1`)
        .success,
    ).toBe(false);
  });

  it("rejects a different port on the bucket host", () => {
    expect(
      parse(`${BUCKET_URL.replace(".com", ".com:8080")}/dogs/1`).success,
    ).toBe(false);
  });

  it("rejects every bad URL in a list that also contains a good one", () => {
    const result = dogInputSchema.safeParse({
      name: "Rex",
      bio: "",
      gender: "MALE",
      images: [
        { url: `${BUCKET_URL}/dogs/1`, position: 0 },
        { url: "https://example.com/payload.png", position: 1 },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ["images", 1, "url"],
    ]);
  });

  it("keeps the check through .partial(), which is what myDog.update accepts", () => {
    const partial = dogInputSchema.partial();

    expect(
      partial.safeParse({
        images: [{ url: `${BUCKET_URL}/dogs/1`, position: 0 }],
      }).success,
    ).toBe(true);
    expect(
      partial.safeParse({
        images: [{ url: "https://example.com/payload.png", position: 0 }],
      }).success,
    ).toBe(false);
    expect(partial.safeParse({ name: "Rex" }).success).toBe(true);
  });

  it("still applies the schema it extends", () => {
    const result = dogInputSchema.safeParse({
      ...dogWithImage(`${BUCKET_URL}/dogs/1`),
      name: "R",
    });

    expect(result.success).toBe(false);
  });

  it("rejects more images than the profile can display", () => {
    const images = Array.from(
      { length: MAX_PROFILE_IMAGES + 1 },
      (_, index) => ({
        url: `${BUCKET_URL}/dogs/${index}`,
        position: index,
      }),
    );

    expect(
      dogInputSchema.safeParse({
        name: "Rex",
        bio: "",
        gender: "MALE",
        images,
      }).success,
    ).toBe(false);
  });
});
