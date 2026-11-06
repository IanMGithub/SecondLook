/**
 * Trusted deployment mode from server/build configuration only.
 * Browser toggles, headers, cookies, and request bodies cannot enable live mode.
 * Missing or invalid values default to demo.
 */
export const deploymentModes = ["demo", "live"] as const;
export type DeploymentMode = (typeof deploymentModes)[number];

export const DEMO_ANALYZE_UNAVAILABLE =
  "This deployment is an interactive demo. It does not analyze submitted messages or call an AI service. Choose a practice example on the home page.";

export function resolveDeploymentMode(raw: string | undefined): DeploymentMode {
  if (typeof raw !== "string") return "demo";
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "live") return "live";
  return "demo";
}

export function isDemoDeployment(
  raw: string | undefined = process.env.SECONDLOOK_DEPLOYMENT_MODE,
): boolean {
  return resolveDeploymentMode(raw) === "demo";
}
