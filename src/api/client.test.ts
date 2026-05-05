import { beforeEach, describe, expect, it, vi } from "vitest";

import { artifactUrl, clearToken, getToken, query, setToken } from "./client";

describe("API client", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("auth token", () => {
    it("round-trips through localStorage", () => {
      expect(getToken()).toBeNull();
      setToken("my-key");
      expect(getToken()).toBe("my-key");
      clearToken();
      expect(getToken()).toBeNull();
    });
  });

  describe("query", () => {
    it("sends POST /query with Bearer token", async () => {
      setToken("test-key-123");

      const mock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ columns: ["cnt"], rows: [[42]] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", mock);

      const result = await query<{ cnt: number }>("SELECT 1 as cnt");

      expect(mock).toHaveBeenCalledOnce();
      const call = mock.mock.calls[0];
      if (!call) throw new Error("no call recorded");
      expect(call[0]).toBe("/query");
      expect(call[1].method).toBe("POST");
      expect(call[1].headers).toMatchObject({
        Authorization: "Bearer test-key-123",
        "Content-Type": "application/json",
      });
      expect(result).toEqual({ columns: ["cnt"], rows: [{ cnt: 42 }] });
    });

    it("sends request without Authorization header when no token", async () => {
      const mock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ columns: ["x"], rows: [[1]] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", mock);

      await query("SELECT 1");

      expect(mock).toHaveBeenCalledOnce();
      const call = mock.mock.calls[0];
      if (!call) throw new Error("no call recorded");
      const headers = call[1].headers as Record<string, string>;
      expect(headers).not.toHaveProperty("Authorization");
    });

    it("throws on non-200 response", async () => {
      const mock = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: "bad query" }), { status: 400 }),
        );
      vi.stubGlobal("fetch", mock);

      await expect(query("BAD SQL")).rejects.toThrow("Query failed: 400");
    });

    it("clears token on 401 response", async () => {
      setToken("bad-key");
      const mock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
        }),
      );
      vi.stubGlobal("fetch", mock);

      await expect(query("SELECT 1")).rejects.toThrow("Query failed: 401");
      expect(getToken()).toBeNull();
    });
  });

  describe("artifactUrl", () => {
    it("builds the correct path", () => {
      expect(artifactUrl("proj", "study", 3, "confusion_matrix")).toBe(
        "/artifact/proj/study/3/confusion_matrix",
      );
    });
  });
});
