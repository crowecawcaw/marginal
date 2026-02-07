import { describe, it, expect, beforeEach, vi } from "vitest";
import { createAppStore } from "./appStore";

// Mock Tauri store so we only test localStorage behavior
vi.mock("@tauri-apps/plugin-store", () => ({
  Store: { load: vi.fn() },
}));

interface TestData {
  name: string;
  count: number;
}

const defaults: TestData = { name: "default", count: 0 };

describe("createAppStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("load returns defaults when empty", () => {
    const store = createAppStore<TestData>("test", defaults);
    expect(store.load()).toEqual({ name: "default", count: 0 });
  });

  it("save merges with existing data", async () => {
    const store = createAppStore<TestData>("test", defaults);
    await store.save({ name: "updated" });
    expect(store.load()).toEqual({ name: "updated", count: 0 });

    await store.save({ count: 5 });
    expect(store.load()).toEqual({ name: "updated", count: 5 });
  });

  it("clear removes data", async () => {
    const store = createAppStore<TestData>("test", defaults);
    await store.save({ name: "saved" });
    expect(store.load().name).toBe("saved");

    await store.clear();
    expect(store.load()).toEqual(defaults);
  });

  it("different namespaces are isolated from each other", async () => {
    const storeA = createAppStore<TestData>("alpha", defaults);
    const storeB = createAppStore<TestData>("beta", defaults);

    await storeA.save({ name: "alpha-value" });
    await storeB.save({ name: "beta-value" });

    expect(storeA.load().name).toBe("alpha-value");
    expect(storeB.load().name).toBe("beta-value");
  });

  it("uses marginal: prefix for localStorage key", async () => {
    const store = createAppStore<TestData>("mystore", defaults);
    await store.save({ name: "test" });

    expect(localStorage.getItem("marginal:mystore")).not.toBeNull();
    const parsed = JSON.parse(localStorage.getItem("marginal:mystore")!);
    expect(parsed.name).toBe("test");
  });

  it("load returns defaults when localStorage has invalid JSON", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("marginal:test", "not valid json");

    const store = createAppStore<TestData>("test", defaults);
    expect(store.load()).toEqual(defaults);

    consoleSpy.mockRestore();
  });

  it("load merges stored partial data with defaults", async () => {
    localStorage.setItem("marginal:test", JSON.stringify({ name: "partial" }));

    const store = createAppStore<TestData>("test", defaults);
    expect(store.load()).toEqual({ name: "partial", count: 0 });
  });
});
