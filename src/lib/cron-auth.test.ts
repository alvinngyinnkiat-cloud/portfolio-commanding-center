import { afterEach, describe, expect, it } from "vitest";
import { isCronAuthorized } from "./cron-auth";

describe("isCronAuthorized", () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  it("returns false when CRON_SECRET is missing", () => {
    delete process.env.CRON_SECRET;
    const request = new Request("http://localhost/api/cron/refresh-scanner", {
      headers: { authorization: "Bearer test-secret" },
    });

    expect(isCronAuthorized(request)).toBe(false);
  });

  it("returns false when Authorization header is missing", () => {
    process.env.CRON_SECRET = "test-secret";
    const request = new Request("http://localhost/api/cron/refresh-scanner");

    expect(isCronAuthorized(request)).toBe(false);
  });

  it("returns false when bearer token does not match", () => {
    process.env.CRON_SECRET = "test-secret";
    const request = new Request("http://localhost/api/cron/refresh-scanner", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    expect(isCronAuthorized(request)).toBe(false);
  });

  it("returns true when bearer token matches CRON_SECRET", () => {
    process.env.CRON_SECRET = "test-secret";
    const request = new Request("http://localhost/api/cron/refresh-scanner", {
      headers: { authorization: "Bearer test-secret" },
    });

    expect(isCronAuthorized(request)).toBe(true);
  });
});
