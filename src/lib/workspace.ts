import {
  prepareSubmission,
  settleAnalysisRequest,
  type AnalysisRequestOutcome,
  type SubmissionSnapshot,
} from "./analyze-request";
import {
  defaultMessageContext,
  MESSAGE_LIMIT,
  type AnalyzeSuccess,
  type MessageContext,
} from "./contract";

export type InputNotice =
  | { type: "invalid"; reason: "empty" | "tooLong" }
  | { type: "error"; message: string };

export type Workspace =
  | {
      phase: "input";
      message: string;
      context: MessageContext;
      notice: InputNotice | null;
    }
  | { phase: "loading"; message: string; context: MessageContext }
  | {
      phase: "result";
      message: string;
      context: MessageContext;
      result: AnalyzeSuccess;
    };

export function idleWorkspace(): Workspace {
  return {
    phase: "input",
    message: "",
    context: { ...defaultMessageContext },
    notice: null,
  };
}

export function showInput(message: string, context: MessageContext): Workspace {
  return {
    phase: "input",
    message: message.slice(0, MESSAGE_LIMIT),
    context,
    notice: null,
  };
}

export function updateMessage(workspace: Workspace, message: string): Workspace {
  return showInput(message, workspace.context);
}

export function updateContext(workspace: Workspace, context: MessageContext): Workspace {
  return showInput(workspace.message, context);
}

/** A fictional example starts from the default context. It does not keep a previous choice. */
export function applyExample(message: string): Workspace {
  return showInput(message, { ...defaultMessageContext });
}

export function beginAnalysis(
  message: string,
  context: MessageContext,
):
  | { status: "invalid"; workspace: Extract<Workspace, { phase: "input" }> }
  | {
      status: "ready";
      submitted: SubmissionSnapshot;
      workspace: Extract<Workspace, { phase: "loading" }>;
    } {
  const prepared = prepareSubmission(message);
  if (!prepared.ok) {
    return {
      status: "invalid",
      workspace: {
        phase: "input",
        message,
        context,
        notice: { type: "invalid", reason: prepared.reason },
      },
    };
  }

  const submitted = { message: prepared.message, context };
  return {
    status: "ready",
    submitted,
    workspace: { phase: "loading", message: prepared.message, context },
  };
}

/**
 * Returns null when the outcome belongs to an older or aborted request.
 * An error keeps the submitted message and context on the form.
 * A result keeps the context the server echoed, which is the user-reported
 * context and not text from the model.
 */
export function finishAnalysis(
  currentRequestId: number,
  requestId: number,
  submitted: SubmissionSnapshot,
  outcome: AnalysisRequestOutcome,
): Workspace | null {
  const settled = settleAnalysisRequest(
    currentRequestId,
    requestId,
    submitted,
    outcome,
  );
  if (!settled) return null;
  if (settled.status === "error") {
    return {
      phase: "input",
      message: submitted.message,
      context: submitted.context,
      notice: { type: "error", message: settled.message },
    };
  }
  return {
    phase: "result",
    message: settled.message,
    context: settled.context,
    result: settled.result,
  };
}

export function editMessage(workspace: Workspace): Workspace {
  if (workspace.phase !== "result") return workspace;
  return {
    phase: "input",
    message: workspace.message,
    context: workspace.context,
    notice: null,
  };
}

export function clearWorkspace(): Workspace {
  return idleWorkspace();
}
