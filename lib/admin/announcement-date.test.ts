import { expect, it } from "vitest";
import { announcementStatus, parseUtcTime } from "./announcement-date";

it("parses scheduled times as UTC and rejects normalized or malformed dates", () => {
  expect(parseUtcTime("2026-02-28T22:05")).toBe("2026-02-28T22:05:00.000Z");
  expect(parseUtcTime("2026-02-29T22:05")).toBeNull();
  expect(parseUtcTime("2026-02-28T22:05+04:00")).toBeNull();
});

it("classifies an ended schedule before checking whether it started", () => {
  const now = Date.parse("2026-05-20T12:00Z");
  const starts_at = "2026-05-21T12:00Z";
  expect(announcementStatus({ starts_at, ends_at: null }, now)).toBe("Scheduled");
  expect(announcementStatus({ starts_at, ends_at: "2026-05-20T11:00Z" }, now)).toBe("Ended");
  expect(announcementStatus({ starts_at: "2026-05-20T12:00Z", ends_at: null }, now)).toBe("Active");
});
