const config = { CRON_SECRET: undefined as string | undefined };

jest.mock("./config", () => ({ config }));

// `require` rather than a top-level import: the guard reads `config` when it
// runs, and the mock above has to be in place first.
const loadGuard = () => require("./cron-auth") as typeof import("./cron-auth");

describe("isAuthorizedCronRequest", () => {
  describe("with a secret configured", () => {
    beforeEach(() => {
      config.CRON_SECRET = "s3cret";
    });

    it("accepts the bearer token Vercel Cron sends", () => {
      const { isAuthorizedCronRequest } = loadGuard();

      expect(isAuthorizedCronRequest("Bearer s3cret")).toBe(true);
    });

    it("rejects a missing header", () => {
      const { isAuthorizedCronRequest } = loadGuard();

      expect(isAuthorizedCronRequest(null)).toBe(false);
      expect(isAuthorizedCronRequest(undefined)).toBe(false);
      expect(isAuthorizedCronRequest("")).toBe(false);
    });

    it("rejects a wrong or malformed bearer", () => {
      const { isAuthorizedCronRequest } = loadGuard();

      expect(isAuthorizedCronRequest("Bearer nope")).toBe(false);
      expect(isAuthorizedCronRequest("Bearer s3cre")).toBe(false);
      expect(isAuthorizedCronRequest("Bearer s3cret ")).toBe(false);
      expect(isAuthorizedCronRequest("s3cret")).toBe(false);
      expect(isAuthorizedCronRequest("Basic s3cret")).toBe(false);
    });
  });

  it("rejects everything when no secret is configured", () => {
    config.CRON_SECRET = undefined;
    const { isAuthorizedCronRequest } = loadGuard();

    expect(isAuthorizedCronRequest("Bearer ")).toBe(false);
    expect(isAuthorizedCronRequest("Bearer anything")).toBe(false);
  });
});
