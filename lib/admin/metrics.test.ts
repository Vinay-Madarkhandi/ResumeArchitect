import { expect, it } from "vitest";
import { fillDays, percentage, utcDays } from "./metrics";

it("fills missing days and includes today in a UTC window", () => {
  const days = utcDays(new Date("2026-01-01T01:30:00+01:00"));
  expect(days).toHaveLength(30);
  expect(days[0]).toBe("2025-12-03");
  expect(fillDays(days, [{ day: "2026-01-01", count: 3 }]).slice(-2)).toEqual([
    { day: "2025-12-31", count: 0 },
    { day: "2026-01-01", count: 3 },
  ]);
});

it("distinguishes a zero rate from an empty denominator", () => {
  expect(percentage(0, 10)).toBe("0.0%");
  expect(percentage(0, 0)).toBe("—");
  expect(percentage(1, 3)).toBe("33.3%");
});
