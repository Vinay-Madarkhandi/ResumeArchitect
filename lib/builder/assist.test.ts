import { expect, it } from "vitest";
import { suggestBuilderField } from "./assist";

it("turns the user's notes into reviewable bullets and flags unsupported figures", async () => {
  const source = "Measured invoice latency. Improved it by 12%.";
  const lines = await suggestBuilderField({
    name: "fake",
    async generate(request) {
      expect(JSON.parse(request.prompt)).toEqual({ source });
      expect(request.system).toContain("experience bullets");
      return JSON.stringify({ lines: ["Improved invoice latency by 12%", "Saved $12k across 3 teams"] });
    },
  }, { field: "experience", source });
  expect(lines).toEqual(["Improved invoice latency by 12%", "Saved [$X] across [N] teams"]);
});
