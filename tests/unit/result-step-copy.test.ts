import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

test("雇主责任险承保资料明确列明员工花名册字段", () => {
  const resultStep = readFileSync(
    join(process.cwd(), "src/features/quote/components/steps/result-step.tsx"),
    "utf8",
  );

  expect(resultStep).toContain("员工花名册（需列明姓名、岗位及身份证号）");
  expect(resultStep).not.toContain("员工花名册（含岗位与出生日期）");
});
