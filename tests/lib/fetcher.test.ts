import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetcher, noCacheFetcher } from "@/lib/fetcher";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
});

describe("fetcher", () => {
  it("returns parsed JSON on a successful response", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ name: "Pasta" }) });
    const result = await fetcher("/api/recipes");
    expect(result).toEqual({ name: "Pasta" });
  });

  it("calls fetch with the provided URL", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await fetcher("/api/recipes");
    expect(mockFetch).toHaveBeenCalledWith("/api/recipes");
  });

  it("throws on a non-OK response so SWR surfaces the error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    await expect(fetcher("/api/recipes")).rejects.toThrow("API error 500");
  });

  it("throws with the correct status code in the message", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    await expect(fetcher("/api/recipes")).rejects.toThrow("API error 404");
  });
});

describe("noCacheFetcher", () => {
  it("returns parsed JSON on a successful response", async () => {
    mockFetch.mockResolvedValue({ json: async () => [{ name: "Eggs" }] });
    const result = await noCacheFetcher("/api/grocery-list");
    expect(result).toEqual([{ name: "Eggs" }]);
  });

  it("calls fetch with cache: no-store to bypass the browser HTTP cache", async () => {
    mockFetch.mockResolvedValue({ json: async () => [] });
    await noCacheFetcher("/api/grocery-list");
    expect(mockFetch).toHaveBeenCalledWith("/api/grocery-list", { cache: "no-store" });
  });
});
