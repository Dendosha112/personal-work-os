import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const registry = JSON.parse(await readFile(new URL("../registry.json", import.meta.url), "utf8"));

test("Company OS starts with exactly seven uniquely identified departments", () => {
  assert.equal(registry.departments.length, 7);
  const ids = registry.departments.map((department) => department.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const department of registry.departments) {
    assert.ok(department.name);
    assert.ok(department.mandate);
    assert.ok(Array.isArray(department.initialScope));
    assert.ok(department.initialScope.length > 0);
  }
});

test("every department has one registered lead agent", () => {
  for (const department of registry.departments) {
    const leads = registry.agents.filter(
      (agent) => agent.departmentId === department.id && agent.role === "department_lead"
    );
    assert.equal(leads.length, 1, department.id);
  }
});

test("agent IDs are unique and every department reference is valid", () => {
  const ids = registry.agents.map((agent) => agent.id);
  assert.equal(new Set(ids).size, ids.length);
  const departmentIds = new Set(registry.departments.map((department) => department.id));
  for (const agent of registry.agents) {
    assert.ok(departmentIds.has(agent.departmentId), agent.id);
    assert.ok(agent.name);
    assert.ok(agent.mandate);
    assert.ok(agent.inputContract.length > 0);
    assert.ok(agent.outputContract.length > 0);
    assert.equal(agent.status, "design_only");
  }
});

test("the master orchestrator exists and cannot execute tools", () => {
  const orchestrators = registry.agents.filter((agent) => agent.role === "orchestrator");
  assert.equal(orchestrators.length, 1);
  assert.equal(orchestrators[0].id, "ceo-master-orchestrator");
  assert.deepEqual(orchestrators[0].allowedTools, []);
  assert.equal(orchestrators[0].executionMode, "proposal_only");
});

test("all initial agents are proposal-only with no tool permissions", () => {
  for (const agent of registry.agents) {
    assert.deepEqual(agent.allowedTools, [], agent.id);
    assert.equal(agent.executionMode, "proposal_only", agent.id);
  }
});

test("external writes and background execution are disabled by default", () => {
  assert.equal(registry.autonomy.defaultMode, "proposal_only");
  assert.equal(registry.autonomy.externalWritesEnabled, false);
  assert.equal(registry.autonomy.backgroundExecutionEnabled, false);
  assert.ok(registry.autonomy.requireHumanApprovalFor.includes("external_write"));
});
