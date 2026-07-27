import { buildAllowedImageOrigins, isAllowedImageUrl } from "./image-url";

const R2_CONFIG = {
  publicImagesBaseUrl: "https://images.pegada.app",
  r2Endpoint: "https://account-id.r2.cloudflarestorage.com",
  awsBucketName: "pegada-dev",
  awsRegion: "sa-east-1",
};

const MINIO_CONFIG = {
  awsS3Endpoint: "http://localhost:9002",
  awsBucketName: "pegada-dev",
  awsRegion: "sa-east-1",
};

const R2_ORIGINS = buildAllowedImageOrigins(R2_CONFIG);

describe("buildAllowedImageOrigins", () => {
  it("collects the R2, legacy and endpoint origins", () => {
    expect([...R2_ORIGINS].sort()).toEqual([
      "https://account-id.r2.cloudflarestorage.com",
      "https://images.pegada.app",
      "https://pegada-dev.s3.amazonaws.com",
      "https://pegada-dev.s3.sa-east-1.amazonaws.com",
    ]);
  });

  it("drops the R2 origins when R2 is not configured", () => {
    expect([...buildAllowedImageOrigins(MINIO_CONFIG)].sort()).toEqual([
      "http://localhost:9002",
      "https://pegada-dev.s3.amazonaws.com",
      "https://pegada-dev.s3.sa-east-1.amazonaws.com",
    ]);
  });

  it("ignores config values that are not http(s) URLs", () => {
    const origins = buildAllowedImageOrigins({
      ...R2_CONFIG,
      publicImagesBaseUrl: "images.pegada.app",
      r2Endpoint: "file:///etc",
    });

    expect(origins.has("https://images.pegada.app")).toBe(false);
    expect(origins.size).toBe(2);
  });
});

describe("isAllowedImageUrl", () => {
  const allows = (url: string) => isAllowedImageUrl(url, R2_ORIGINS);

  it("allows the R2 custom domain", () => {
    expect(allows("https://images.pegada.app/dogs/1712345678")).toBe(true);
  });

  it("allows the R2 API endpoint", () => {
    expect(allows("https://account-id.r2.cloudflarestorage.com/pegava/dogs/1712345678")).toBe(true);
  });

  it("allows the legacy virtual-hosted S3 bucket", () => {
    expect(allows("https://pegada-dev.s3.sa-east-1.amazonaws.com/dogs/1712345678")).toBe(true);
  });

  it("allows the MinIO endpoint only when it is configured", () => {
    const minioUrl = "http://localhost:9002/pegada-dev/dogs/1712345678";

    expect(allows(minioUrl)).toBe(false);
    expect(isAllowedImageUrl(minioUrl, buildAllowedImageOrigins(MINIO_CONFIG))).toBe(true);
  });

  it("rejects an arbitrary external host", () => {
    expect(allows("https://example.com/payload.png")).toBe(false);
  });

  it("rejects loopback and private addresses", () => {
    expect(allows("http://localhost/latest/meta-data/")).toBe(false);
    expect(allows("http://127.0.0.1:8080/")).toBe(false);
    expect(allows("http://[::1]/")).toBe(false);
    expect(allows("http://10.0.0.5/")).toBe(false);
    expect(allows("http://192.168.1.1/")).toBe(false);
    expect(allows("http://169.254.169.254/latest/meta-data/")).toBe(false);
  });

  it("rejects a host that only contains an allowed host as a substring", () => {
    expect(allows("https://images.pegada.app.example.com/x")).toBe(false);
    expect(allows("https://evil-images.pegada.app/x")).toBe(false);
    expect(allows("https://example.com/images.pegada.app/x")).toBe(false);
    expect(allows("https://images.pegada.app.example.com/images.pegada.app")).toBe(false);
  });

  it("rejects credentials, ports and schemes that differ from the allowed origin", () => {
    expect(allows("https://images.pegada.app:8080/x")).toBe(false);
    expect(allows("http://images.pegada.app/x")).toBe(false);
    expect(allows("https://images.pegada.app@example.com/x")).toBe(false);
  });

  it("rejects non-http schemes and unparseable values", () => {
    expect(allows("file:///etc/passwd")).toBe(false);
    expect(allows("gopher://images.pegada.app/x")).toBe(false);
    expect(allows("data:image/png;base64,AAAA")).toBe(false);
    expect(allows("")).toBe(false);
    expect(allows("not a url")).toBe(false);
  });
});
