import {
  analyzeSuccessSchema,
  parseAnalyzeRequest,
  type AnalyzeError,
} from "../../../lib/contract";
import {
  DEMO_ANALYZE_UNAVAILABLE,
  resolveDeploymentMode,
  type DeploymentMode,
} from "../../../lib/deployment-mode";
import {
  analyzeMessage,
  type AnalyzeOptions,
} from "../../../server/analyze-message";
import { resolveOpenAITimeoutMs } from "../../../server/openai-analyzer";

const JSON_MEDIA_TYPE = "application/json";

function allowsJson(contentType: string | null): boolean {
  if (contentType === null) return false;
  const mediaType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return mediaType === JSON_MEDIA_TYPE;
}

function errorResponse(
  status: AnalyzeErrorStatus,
  code: string,
  message: string,
): Response {
  const body: AnalyzeError = {
    ok: false,
    error: { code, message },
  };

  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

type AnalyzeErrorStatus = 400 | 403 | 413 | 415;

function nonBlankEnv(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export type HandleAnalyzeOptions = AnalyzeOptions & {
  /**
   * Trusted deployment mode for this request. POST always sets this from
   * SECONDLOOK_DEPLOYMENT_MODE. Client bodies, headers, and cookies are ignored.
   * When omitted (unit tests), defaults to live so injected-provider tests keep working.
   */
  deploymentMode?: DeploymentMode;
};

/**
 * Validates a message, then returns rules or model analysis.
 * The 5,000-character check is an application limit. It is not a transport
 * body-size limit, and this route is not production-hardened.
 * Configuration is read only here. Tests pass options and do not use the environment.
 *
 * Demo deployments refuse analysis before any provider call. Request parameters
 * cannot re-enable live analysis.
 */
export async function POST(request: Request): Promise<Response> {
  const deploymentMode = resolveDeploymentMode(
    process.env.SECONDLOOK_DEPLOYMENT_MODE,
  );
  if (deploymentMode === "demo") {
    // Do not read API keys or invoke analyzeMessage in demo mode.
    return handleAnalyzeRequest(request, { deploymentMode: "demo" });
  }

  return handleAnalyzeRequest(request, {
    deploymentMode: "live",
    apiKey: nonBlankEnv(process.env.OPENAI_API_KEY),
    model: nonBlankEnv(process.env.OPENAI_MODEL),
    timeoutMs: resolveOpenAITimeoutMs(process.env.OPENAI_TIMEOUT_MS),
    diagnostics: process.env.OPENAI_ANALYZE_DIAGNOSTICS === "1",
  });
}

export async function handleAnalyzeRequest(
  request: Request,
  options: HandleAnalyzeOptions = {},
): Promise<Response> {
  const deploymentMode = options.deploymentMode ?? "live";
  if (deploymentMode === "demo") {
    return errorResponse(403, "DEMO_ONLY", DEMO_ANALYZE_UNAVAILABLE);
  }

  if (!allowsJson(request.headers.get("content-type"))) {
    return errorResponse(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type must be application/json.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse(
        400,
        "INVALID_JSON",
        "Request body must be valid JSON.",
      );
    }
    throw error;
  }

  const parsed = parseAnalyzeRequest(body);
  if (!parsed.ok) {
    return errorResponse(parsed.status, parsed.code, parsed.error);
  }

  const result = await analyzeMessage(parsed.message, {
    ...options,
    context: parsed.context,
  });
  return Response.json(analyzeSuccessSchema.parse(result), {
    headers: { "Cache-Control": "no-store" },
  });
}
