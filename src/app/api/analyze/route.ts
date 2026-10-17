import { parseAnalyzeRequest, type AnalyzeError } from "../../../lib/contract";

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

type AnalyzeErrorStatus = 400 | 413 | 415 | 503;

/**
 * Validates a message and reports that live analysis is not connected.
 * The 5,000-character check is an application limit. It is not a transport
 * body-size limit, and this route is not production-hardened.
 */
export async function POST(request: Request): Promise<Response> {
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

  return errorResponse(
    503,
    "ANALYSIS_UNAVAILABLE",
    "Live analysis is not connected yet.",
  );
}
