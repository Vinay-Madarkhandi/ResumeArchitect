import { describe, expect, it } from "vitest";
import { dateStyles, findDates, findRanges, yearsCovered } from "./dates";

const asOf = new Date(2026, 10, 18);

describe("findDates", () => {
  it.each([
    ["Jan 2020", "Mon YYYY"],
    ["Sept. 2021", "Mon YYYY"],
    ["January 2020", "Month YYYY"],
    ["01/2020", "MM/YYYY"],
    ["1/2020", "MM/YYYY"],
    ["03.2021", "MM.YYYY"],
    ["2020-01", "YYYY-MM"],
    ["Summer 2019", "Season YYYY"],
    ["Jun '19", "Mon 'YY"],
  ])("reads %s as %s", (text, style) => {
    expect(findDates(`Engineer · ${text}`).map((d) => d.style)).toEqual([style]);
  });

  it("reads bare years only inside a range", () => {
    expect(findDates("2018 – 2022").map((d) => d.text)).toEqual(["2018", "2022"]);
    expect(findDates("2019 - Present").map((d) => d.text)).toEqual(["2019"]);
    expect(findDates("AWS Certified 2022. Class of 2016.")).toEqual([]);
  });
});

describe("dateStyles", () => {
  it("lets May fit either month-name style", () => {
    expect(dateStyles(findDates("January 2020 – May 2021"))).toEqual(["Month YYYY"]);
    expect(dateStyles(findDates("Jan 2020 – May 2021"))).toEqual(["Mon YYYY"]);
    expect(dateStyles(findDates("May 2020 – May 2021"))).toEqual(["Month YYYY"]);
  });

  it("lists every style a resume mixes", () => {
    expect(dateStyles(findDates("Jan 2020 – Present\n03/2018 – 12/2019\n2015 – 2017")).sort()).toEqual(
      ["MM/YYYY", "Mon YYYY", "YYYY"].sort(),
    );
  });
});

describe("findRanges and yearsCovered", () => {
  it("reads month ranges and Present as today", () => {
    const ranges = findRanges("Engineer · Jan 2020 – Dec 2021\nLead · Jan 2022 – Present", asOf);
    expect(ranges).toHaveLength(2);
    expect(yearsCovered(ranges)).toBe(6.9);
  });

  it("counts overlapping jobs once", () => {
    const ranges = findRanges("Jan 2020 – Dec 2021\nJan 2021 – Dec 2021", asOf);
    expect(yearsCovered(ranges)).toBe(2);
  });

  it("reads year-only ranges from mid-year to mid-year", () => {
    expect(yearsCovered(findRanges("2016 – 2020", asOf))).toBe(4.1);
  });

  it("is 0 with no ranges", () => {
    expect(yearsCovered(findRanges("No dates here", asOf))).toBe(0);
  });
});
