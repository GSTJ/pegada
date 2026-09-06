import { signAccessToken } from "./auth-token";
import { config } from "./config";
import { authorizeRevenueCatRequest } from "./revenuecat-auth";

describe("authorizeRevenueCatRequest", () => {
  const originalSecret = config.REVENUECAT_WEBHOOK_SECRET;

  afterEach(() => {
    config.REVENUECAT_WEBHOOK_SECRET = originalSecret;
  });

  it("says a delivery with no header arrived without a credential", () => {
    expect(authorizeRevenueCatRequest(null)).toBe("missing");
    expect(authorizeRevenueCatRequest("")).toBe("missing");
  });

  it("accepts the shared secret the dashboard sends back verbatim", () => {
    config.REVENUECAT_WEBHOOK_SECRET = "a-long-shared-secret";

    expect(
      authorizeRevenueCatRequest("Bearer a-long-shared-secret"),
    ).toBeNull();
  });

  it("refuses a secret that does not match, whatever its length", () => {
    config.REVENUECAT_WEBHOOK_SECRET = "a-long-shared-secret";

    expect(authorizeRevenueCatRequest("Bearer wrong")).toBe("rejected");
    expect(authorizeRevenueCatRequest("Bearer a-long-shared-secrez")).toBe(
      "rejected",
    );
  });

  it("refuses everything while the secret is unset rather than falling open", () => {
    config.REVENUECAT_WEBHOOK_SECRET = undefined;

    expect(authorizeRevenueCatRequest("Bearer anything")).toBe("rejected");
  });

  it("still accepts a legacy webhook token that has not aged out", () => {
    config.REVENUECAT_WEBHOOK_SECRET = undefined;
    const token = signAccessToken({ sub: "WEBHOOK" });

    expect(authorizeRevenueCatRequest(`Bearer ${token}`)).toBeNull();
  });

  it("refuses a legacy token that belongs to a person rather than the webhook", () => {
    config.REVENUECAT_WEBHOOK_SECRET = undefined;
    const token = signAccessToken({ sub: "some-real-user-id" });

    expect(authorizeRevenueCatRequest(`Bearer ${token}`)).toBe("rejected");
  });
});
