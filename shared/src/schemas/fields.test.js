import { describe, expect, it } from "vitest";
import {
  countryCode,
  currencyCode,
  email,
  httpUrl,
  nullableString,
  objectId,
  optionalString,
  pagination,
  phone,
  requiredString,
} from "./fields.js";

const firstMessage = (result) => result.error.issues[0].message;

describe("requiredString", () => {
  const schema = requiredString(5);

  it.each([
    ["", "Required"],
    ["   ", "Required"],
    ["toolong", "Must be 5 characters or fewer"],
  ])("rejects %j with %j", (input, message) => {
    expect(firstMessage(schema.safeParse(input))).toBe(message);
  });

  it("trims valid input", () => {
    expect(schema.parse("  abc ")).toBe("abc");
  });
});

describe("optionalString and nullableString", () => {
  it("optional allows undefined but not null", () => {
    expect(optionalString(5).parse(undefined)).toBeUndefined();
    expect(optionalString(5).safeParse(null).success).toBe(false);
  });

  it("nullable allows null but enforces the max", () => {
    expect(nullableString(5).parse(null)).toBeNull();
    expect(nullableString(5).safeParse("toolong").success).toBe(false);
  });
});

describe("email", () => {
  it("lowercases and trims", () => {
    expect(email().parse("  Priya@Example.COM ")).toBe("priya@example.com");
  });

  it.each(["not-an-email", "a@b", `${"a".repeat(250)}@x.com`])("rejects %j", (input) => {
    expect(email().safeParse(input).success).toBe(false);
  });
});

describe("httpUrl", () => {
  it.each(["https://github.com/priya", "http://example.com"])("accepts %j", (input) => {
    expect(httpUrl().parse(input)).toBe(input);
  });

  it.each(["javascript:alert(1)", "data:text/html,hi", "ftp://example.com", "github.com/priya"])(
    "rejects %j",
    (input) => {
      expect(httpUrl().safeParse(input).success).toBe(false);
    },
  );
});

describe("phone", () => {
  it.each(["+91 98765 43210", "09876543210", "(022) 2345-6789"])("accepts %j", (input) => {
    expect(phone().safeParse(input).success).toBe(true);
  });

  it.each(["123", "phone: 98765", "+91 98765 43210 ext 99999"])("rejects %j", (input) => {
    expect(phone().safeParse(input).success).toBe(false);
  });
});

describe("country and currency codes", () => {
  it("uppercases valid codes", () => {
    expect(countryCode().parse("in")).toBe("IN");
    expect(currencyCode().parse("inr")).toBe("INR");
  });

  it("rejects wrong lengths", () => {
    expect(countryCode().safeParse("IND").success).toBe(false);
    expect(currencyCode().safeParse("RS").success).toBe(false);
  });
});

describe("objectId", () => {
  it("accepts a 24-character hex id and rejects anything else", () => {
    expect(objectId().safeParse("65f1c2a9b4e8d7f6a5b4c3d2").success).toBe(true);
    expect(objectId().safeParse("123").success).toBe(false);
    expect(objectId().safeParse("zzzzzzzzzzzzzzzzzzzzzzzz").success).toBe(false);
  });
});

describe("pagination", () => {
  it("defaults to page 1, limit 20", () => {
    expect(pagination.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it("coerces query-string numbers", () => {
    expect(pagination.parse({ page: "3", limit: "50" })).toEqual({ page: 3, limit: 50 });
  });

  it.each([{ page: "0" }, { limit: "51" }, { limit: "0" }, { page: "1.5" }])(
    "rejects %j",
    (input) => {
      expect(pagination.safeParse(input).success).toBe(false);
    },
  );
});
