import { describe, it, expect } from "vitest";
import { merge3 } from "./mergeText";

describe("merge3", () => {
  it("returns base when all three are identical", () => {
    const s = "line1\nline2\nline3";
    expect(merge3(s, s, s)).toBe(s);
  });

  it("returns ours when ours === theirs (no divergence)", () => {
    const base = "line1\nline2";
    const both = "line1\nline2\nline3";
    expect(merge3(base, both, both)).toBe(both);
  });

  it("returns theirs when only remote changed (base === ours)", () => {
    const base = "line1\nline2";
    const theirs = "line1\nline2\nline3 added remotely";
    expect(merge3(base, base, theirs)).toBe(theirs);
  });

  it("returns ours when only local changed (base === theirs)", () => {
    const base = "line1\nline2";
    const ours = "line1\nline2\nline3 added locally";
    expect(merge3(base, ours, base)).toBe(ours);
  });

  it("returns null when both sides changed the same line differently", () => {
    const base = "line1\nshared\nline3";
    const ours = "line1\nours changed\nline3";
    const theirs = "line1\ntheirs changed\nline3";
    expect(merge3(base, ours, theirs)).toBeNull();
  });

  it("returns null when both sides added different content (empty base)", () => {
    expect(merge3("", "ours content", "theirs content")).toBeNull();
  });

  it("returns null when both sides deleted everything differently", () => {
    const base = "line1\nline2\nline3";
    const ours = "ours only";
    const theirs = "theirs only";
    expect(merge3(base, ours, theirs)).toBeNull();
  });

  it("returns null when user deleted all and remote changed", () => {
    const base = "line1\nline2";
    const ours = "";
    const theirs = "line1\nmodified line2";
    expect(merge3(base, ours, theirs)).toBeNull();
  });

  it("merges non-overlapping additions (local adds at end, remote adds at middle)", () => {
    const base = "line1\nline2\nline3";
    const ours = "line1\nline2\nline3\nlocal line4";
    const theirs = "line1\nremote line1.5\nline2\nline3";
    const result = merge3(base, ours, theirs);
    // Should contain both additions
    expect(result).not.toBeNull();
    if (result !== null) {
      expect(result).toContain("local line4");
      expect(result).toContain("remote line1.5");
    }
  });

  it("handles single line base with remote-only addition", () => {
    const base = "hello";
    const theirs = "hello\nworld";
    expect(merge3(base, base, theirs)).toBe(theirs);
  });

  it("handles multiline additions that do not conflict", () => {
    const base = "a\nb\nc\nd\ne";
    const ours = "a\nb\nc\nd\ne\nf\ng"; // local appends
    const theirs = "a\nb\nc\nd\ne"; // remote unchanged
    // base === theirs, so only local changed
    expect(merge3(base, ours, theirs)).toBe(ours);
  });

  it("handles remote line deletion when local is unchanged", () => {
    const base = "line1\nline2\nline3";
    const ours = "line1\nline2\nline3"; // unchanged
    const theirs = "line1\nline3"; // line2 deleted
    expect(merge3(base, ours, theirs)).toBe(theirs);
  });

  it("handles local line deletion when remote is unchanged", () => {
    const base = "line1\nline2\nline3";
    const ours = "line1\nline3"; // line2 deleted locally
    const theirs = "line1\nline2\nline3"; // unchanged
    expect(merge3(base, ours, theirs)).toBe(ours);
  });
});
