import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { getAuthUser } from "@/lib/auth-guard";

describe("getAuthUser", () => {
  it("returns user when session exists", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date().toISOString(),
    } as any);

    const user = await getAuthUser();
    expect(user).toEqual({ id: "user-1", email: "test@test.com" });
  });

  it("returns null when no session", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const user = await getAuthUser();
    expect(user).toBeNull();
  });
});
