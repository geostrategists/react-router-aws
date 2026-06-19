import { describe, expect, it } from "vitest";

import { resolveHost } from "../src/adapters/host";

describe("resolveHost", () => {
  it("returns a plain hostname unchanged", () => {
    expect(resolveHost("example.com")).toBe("example.com");
  });

  it("keeps a valid port", () => {
    expect(resolveHost("example.com:8443")).toBe("example.com:8443");
  });

  it("falls back to localhost for missing values", () => {
    expect(resolveHost(undefined)).toBe("localhost");
    expect(resolveHost(null)).toBe("localhost");
    expect(resolveHost("")).toBe("localhost");
  });

  it("drops a non-numeric port", () => {
    expect(resolveHost("example.com:notaport")).toBe("example.com");
  });

  it("strips invalid characters from the hostname", () => {
    expect(resolveHost("example.com/path")).toBe("example.com");
    expect(resolveHost("user@example.com")).toBe("user");
    expect(resolveHost("example.com:4444/invalid@chars")).toBe("example.com:4444");
  });

  it("falls back to localhost when the hostname is only invalid characters", () => {
    expect(resolveHost("#invalid")).toBe("localhost");
  });
});
