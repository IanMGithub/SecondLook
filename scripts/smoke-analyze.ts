const message =
  "Your account will be restricted in 30 minutes. Please send your verification code.";

/** Client abort above the default 30s server deadline so the smoke test does not race it. */
const CLIENT_TIMEOUT_MS = 45_000;

type SmokeReport = {
  status: number;
  ok: boolean;
  elapsedMs?: number;
  mode?: "ai" | "rules";
  assessment?: "high_concern" | "some_concern" | "no_specific_concern" | "unclear";
  indicatorCount?: number;
  fallbackReason?:
    | "not_configured"
    | "timeout"
    | "rate_limited"
    | "provider_error"
    | "invalid_output";
};

function report(value: SmokeReport) {
  console.log(JSON.stringify(value));
}

const assessments = new Set([
  "high_concern",
  "some_concern",
  "no_specific_concern",
  "unclear",
]);
const modes = new Set(["ai", "rules"]);
const reasons = new Set([
  "not_configured",
  "timeout",
  "rate_limited",
  "provider_error",
  "invalid_output",
]);

async function main() {
  const timed = process.argv.includes("--timed");
  const started = Date.now();
  let response: Response;
  try {
    response = await fetch("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
  } catch {
    report({
      status: 0,
      ok: false,
      ...(timed ? { elapsedMs: Date.now() - started } : {}),
    });
    return;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    report({
      status: response.status,
      ok: false,
      ...(timed ? { elapsedMs: Date.now() - started } : {}),
    });
    return;
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("ok" in body) ||
    body.ok !== true ||
    !("mode" in body) ||
    !("analysis" in body) ||
    typeof body.analysis !== "object" ||
    body.analysis === null
  ) {
    report({
      status: response.status,
      ok: false,
      ...(timed ? { elapsedMs: Date.now() - started } : {}),
    });
    return;
  }

  const mode = "mode" in body ? body.mode : undefined;
  const analysis = body.analysis as {
    assessment?: unknown;
    indicators?: unknown;
  };
  const fallback = "fallbackReason" in body ? body.fallbackReason : undefined;

  if (
    typeof mode !== "string" ||
    !modes.has(mode) ||
    typeof analysis.assessment !== "string" ||
    !assessments.has(analysis.assessment) ||
    !Array.isArray(analysis.indicators) ||
    (fallback !== undefined &&
      (typeof fallback !== "string" || !reasons.has(fallback)))
  ) {
    report({
      status: response.status,
      ok: false,
      ...(timed ? { elapsedMs: Date.now() - started } : {}),
    });
    return;
  }

  report({
    status: response.status,
    ok: true,
    ...(timed ? { elapsedMs: Date.now() - started } : {}),
    mode: mode as SmokeReport["mode"],
    assessment: analysis.assessment as SmokeReport["assessment"],
    indicatorCount: analysis.indicators.length,
    ...(typeof fallback === "string"
      ? { fallbackReason: fallback as SmokeReport["fallbackReason"] }
      : {}),
  });
}

main();
