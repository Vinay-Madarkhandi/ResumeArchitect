import { expect, it } from "vitest";
import { suggestBuilderField } from "./assist";

it("turns the user's notes into reviewable bullets and flags unsupported figures", async () => {
  const source = "Improved invoice latency by 12%.";
  const lines = await suggestBuilderField({
    name: "fake",
    async generate(request) {
      expect(JSON.parse(request.prompt)).toEqual({ source });
      expect(request.system).toContain("experience bullets");
      return JSON.stringify({ lines: ["Improved invoice latency by 12%", "Saved $12k across 3 teams"] });
    },
  }, { field: "experience", source });
  expect(lines[0]).toEqual({ text: "Improved invoice latency by 12%", flags: [] });
  expect(lines[1]).toMatchObject({ text: "[Verify claim]", flags: expect.arrayContaining([
    expect.objectContaining({ value: "$12k" }), expect.objectContaining({ value: "3" }),
  ]) });
});
