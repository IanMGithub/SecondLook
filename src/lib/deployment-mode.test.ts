import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEMO_ANALYZE_UNAVAILABLE,
  isDemoDeployment,
  resolveDeploymentMode,
} from "./deployment-mode";

describe("deployment mode", () => {
  it("defaults to demo when missing or invalid", () => {
    assert.equal(resolveDeploymentMode(undefined), "demo");
    assert.equal(resolveDeploymentMode(""), "demo");
    assert.equal(resolveDeploymentMode("DEMO"), "demo");
    assert.equal(resolveDeploymentMode("production"), "demo");
    assert.equal(resolveDeploymentMode("true"), "demo");
    assert.equal(resolveDeploymentMode("live"), "live");
    assert.equal(resolveDeploymentMode(" LIVE "), "live");
  });

  it("treats only the trusted live value as non-demo", () => {
    assert.equal(isDemoDeployment(undefined), true);
    assert.equal(isDemoDeployment("live"), false);
    assert.equal(isDemoDeployment("demo"), true);
    assert.equal(DEMO_ANALYZE_UNAVAILABLE.includes("call an AI service"), true);
  });
});
