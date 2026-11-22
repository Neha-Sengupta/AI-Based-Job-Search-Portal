import { describe, expect, it } from "vitest";
import { detectWorkModel, isOpenToIndia, parseLocation } from "./location.js";

describe("parseLocation", () => {
  it.each([
    ["Bengaluru, Karnataka, India", "Bengaluru", "IN"],
    ["Bangalore", "Bengaluru", "IN"],
    ["Bengaluru-VTP, India", "Bengaluru", "IN"],
    ["Gurgaon", "Gurugram", "IN"],
    ["hyderabad", "Hyderabad", "IN"],
    ["Hybrid (Pune)", "Pune", "IN"],
    ["Remote - India", null, "IN"],
    ["tamil nadu", null, "IN"],
    ["Mumbai, Bengaluru", "Mumbai", "IN"],
    ["San Francisco, USA; Bengaluru, India", "Bengaluru", "IN"],
    ["Berlin, Germany", null, "DE"],
    ["Hyderabad, Pakistan", null, "PK"],
    ["Indianapolis, Indiana", null, null],
    ["Remote", null, null],
    ["", null, null],
  ])("%s → %s, %s", (raw, city, country) => {
    expect(parseLocation(raw)).toEqual({ city, country, raw });
  });

  it("does not read lowercase words as short state codes", () => {
    expect(parseLocation("Set up remotely").country).toBeNull();
  });
});

describe("detectWorkModel", () => {
  it.each([
    ["Remote - India", "remote"],
    ["Hybrid (Pune)", "hybrid"],
    ["Hybrid - 2 days remote", "hybrid"],
    ["On-site, Mumbai", "onsite"],
    ["Bengaluru", "unknown"],
    [undefined, "unknown"],
  ])("%s → %s", (text, model) => {
    expect(detectWorkModel(text)).toBe(model);
  });
});

describe("isOpenToIndia", () => {
  const job = (raw, workModel) => ({ location: parseLocation(raw), workModel });

  it.each([
    ["Bengaluru", "onsite", false, true],
    ["Remote - APAC", "remote", false, true],
    ["Remote (Worldwide)", "remote", false, true],
    ["Southeast Asia; United Kingdom", "remote", false, false],
    ["Remote", "remote", false, false],
    ["Remote", "remote", true, true],
    ["Remote - US", "remote", true, false],
    ["San Francisco", "remote", true, false],
    ["London, UK", "onsite", false, false],
  ])("%s (%s, Indian company: %s) → %s", (raw, workModel, indianCompany, expected) => {
    expect(isOpenToIndia(job(raw, workModel), { indianCompany })).toBe(expected);
  });
});
