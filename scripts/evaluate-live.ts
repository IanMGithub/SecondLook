import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  contextComparisonCases,
  evaluationCases,
  evaluationScopeNote,
} from "../src/lib/evaluation-cases";
import {
  evaluationReportPath,
  LIVE_EVALUATION_WARNING,
  parseEvaluationArgs,
  requestFailedRecord,
  summarizeLiveResponse,
  type LiveCaseRecord,
} from "../src/lib/live-evaluation";

const endpoint = "http://localhost:3000/api/analyze";

async function main() {
  const argv = process.argv.slice(2);
  const comparison = argv.includes("--context-pairs");
  const source = comparison ? contextComparisonCases : evaluationCases;
  const plan = parseEvaluationArgs(argv, source.length);
  console.log(LIVE_EVALUATION_WARNING);
  if (comparison) {
    console.log(
      "Context comparison sends each fictional message twice: once with no context object, then once with the case context. It can spend money. A rules result does not show that live false positives improved.",
    );
  }

  if (!plan.run) {
    const hint =
      plan.reason === "invalid-limit"
        ? "The limit must be a whole number of at least 1. No requests were sent."
        : "No requests were sent. Pass --confirm to run. --limit N sets how many cases to send (default 3).";
    console.log(hint);
    return;
  }

  const selected = source.slice(0, plan.limit);
  const requestCount = comparison ? selected.length * 2 : selected.length;
  console.log(
    `Sending ${requestCount} fictional request(s), one at a time, to ${endpoint}. Each request can spend money if the server calls OpenAI.`,
  );

  const jobs = comparison
    ? selected.flatMap((item) => [
        {
          id: `${item.id}:absent`,
          message: item.message,
          body: { message: item.message },
        },
        {
          id: `${item.id}:present`,
          message: item.message,
          body: { message: item.message, context: item.context },
        },
      ])
    : selected.map((item) => ({
        id: item.id,
        message: item.message,
        body: {
          message: item.message,
          ...("context" in item && item.context ? { context: item.context } : {}),
        },
      }));

  const cases: LiveCaseRecord[] = [];
  for (const item of jobs) {
    let record: LiveCaseRecord;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(item.body),
        signal: AbortSignal.timeout(45_000),
      });
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      record =
        body === null
          ? {
              id: item.id,
              classification: "rejected",
              httpStatus: response.status,
              rejection: "unreadable",
            }
          : summarizeLiveResponse(item.id, item.message, response.status, body);
      if (item.id.endsWith(":absent")) record = { ...record, context: "absent" };
      if (item.id.endsWith(":present")) record = { ...record, context: "present" };
    } catch {
      record = requestFailedRecord(item.id);
    }

    cases.push(record);
    console.log(
      JSON.stringify({
        id: record.id,
        classification: record.classification,
        httpStatus: record.httpStatus,
        ...(record.mode ? { mode: record.mode } : {}),
        ...(record.fallbackReason ? { fallbackReason: record.fallbackReason } : {}),
        ...(record.assessment ? { assessment: record.assessment } : {}),
        ...(record.indicatorCount !== undefined
          ? { indicatorCount: record.indicatorCount }
          : {}),
      }),
    );
  }

  const report = {
    note: comparison
      ? `${evaluationScopeNote} This file compares context absent and present. It is not proof that live false positives improved.`
      : evaluationScopeNote,
    warning: LIVE_EVALUATION_WARNING,
    endpoint,
    comparison,
    caseLimit: plan.limit,
    cases,
  };
  const relativePath = evaluationReportPath(new Date(), comparison);
  const filePath = path.join(process.cwd(), relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${relativePath}`);
}

main();
