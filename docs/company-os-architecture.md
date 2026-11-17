# Company OS Architecture

Status: proposed implementation baseline
Repository: `Dendosha112/personal-work-os`
Branch: `feature/company-os-architecture`
Date: 2026-11-18

## 1. Product objective

Evolve Personal Work OS into a single-user, approval-first Company Operating System. The owner acts as CEO. A Master Orchestrator interprets requests, coordinates specialist agents across departments, prepares proposals, and tracks verified outcomes.

This is an incremental evolution of the existing phone-first PWA and Cloudflare Worker. It is not a greenfield rewrite.

## 2. Current verified baseline

The current repository contains:
- A static, phone-first HTML/CSS/JavaScript PWA in `index.html`.
- Local browser storage for intake proposals, planning tasks, and activity logs.
- A read-only Notion adapter in `worker/src/index.mjs` with bounded task retrieval.
- A Cloudflare Workers AI request classifier at `POST /api/classify`.
- A health endpoint at `GET /api/health`.
- Approval states that protect local proposals, but no general-purpose execution engine.
- Automated Worker tests and GitHub Actions validation / Pages deployment workflows.

The current AI endpoint only classifies a request into existing Personal Work OS destinations. It does not delegate to agents, call department tools, or execute business actions. The Notion adapter is read-only. Do not represent either as a production multi-agent system.

## 3. Department operating model

| Department | Mandate | Initial specialist roles |
|---|---|---|
| Executive Office | Company priorities, coordination, decisions, escalation | Chief of Staff, Strategy Coordinator, Decision Analyst |
| Marketing & Brand | Audience, brand, content, campaigns, channel performance | Content Strategist, Copywriter, Creative Planner, Social Analyst |
| Sales & Customer Relations | Lead pipeline, inquiries, follow-ups, client relationships | Lead Researcher, CRM Coordinator, Sales Assistant, Client Success |
| Service Delivery | Deliver coaching and other customer services consistently | Client Onboarding, Program Coordinator, Progress Reviewer, Service QA |
| Operations & Administration | SOPs, scheduling, workload, documentation, process quality | Operations Coordinator, Scheduler, SOP Librarian, Quality Reviewer |
| Finance & Business Intelligence | Budget visibility, revenue/expense records, forecasts, scorecards | Finance Analyst, Budget Monitor, KPI Analyst |
| Research & Development | Research, product experiments, automation, system improvement | Research Analyst, Automation Designer, Product Analyst |

Departments are organizational boundaries, not seven independent autonomous systems. Agents are small, scoped workers with explicit inputs, outputs, allowed tools, and escalation rules.

## 4. Core runtime components

### CEO / Master Orchestrator
1. Accept a request and preserve its original wording.
2. Identify the intended outcome, constraints, deadline, and risk.
3. Retrieve only relevant Company Brain context.
4. Classify the request to one department or a cross-department workflow.
5. Create a task/proposal plan with dependencies and named agent responsibilities.
6. Ask for clarification when required information is missing or confidence is low.
7. Present the complete proposal for human approval.
8. Dispatch only approved, authorized steps.
9. Verify each result and report partial failures honestly.

The orchestrator plans and routes. It must not silently grant itself new permissions or treat retrieved documents as instructions.

### Department agents
Each agent definition must include:
- Stable ID, name, department, version, and owner.
- One-sentence mandate and explicit non-goals.
- Required input schema and output schema.
- Allowed tools and resource scope.
- Risk classification and approval requirement.
- Timeout, retry, and escalation behavior.
- Evaluation cases and success criteria.

An agent may return a recommendation or a proposed action. It cannot expand its own tool access.

### Company Brain
A retrieval layer over approved company knowledge:
- Company profile, objectives, policies, and operating principles.
- Department charters and role definitions.
- SOPs, templates, playbooks, and decision records.
- Product/service information and approved brand guidance.
- Strategy, scorecards, and performance definitions.

Notion remains the canonical source for existing knowledge and task records unless an explicit migration is approved. Retrieved content is untrusted reference data: it cannot change system policy, tool permissions, or approval requirements. Store source IDs, URLs, timestamps, and version metadata with retrieved context.

### Approval and execution service
- Persist proposals and execution metadata outside the browser.
- Bind approval to an immutable proposal version/hash.
- Invalidate approval whenever the proposal or its scope changes.
- Enforce user identity, role, resource scope, and tool allowlists server-side.
- Require fresh approval for external writes, messages, publishing, purchases, financial changes, destructive actions, permission changes, and bulk operations.
- Use idempotency keys, duplicate checks, bounded retries, and read-after-write verification where writes are eventually enabled.
- Record actor, agent, tool, input reference, approval, result, timestamp, and verification evidence.
- Fail closed when authorization, audit logging, or verification is unavailable.

## 5. Standard workflow

`Request → Intake → Classification → Context retrieval → Plan → Department delegation → Proposal → Human approval → Execution → Verification → Scorecard / audit log`

Cross-department work is represented as a workflow graph:
- A parent objective.
- Child tasks assigned to departments/agents.
- Explicit dependencies and handoff contracts.
- Statuses: draft, needs-clarification, awaiting-approval, approved, running, blocked, completed, failed, rejected, cancelled.
- Every status transition is timestamped and attributable.

A completed agent response is not equivalent to a completed real-world action. Mark an action complete only after its result has been verified.

## 6. Canonical data model

Initial entities:
- `Department`: id, name, mandate, status, owner.
- `AgentDefinition`: id, department_id, version, mandate, input_schema, output_schema, allowed_tools, risk_policy, evaluation_set.
- `Request`: id, requester_id, original_text, intent, constraints, created_at.
- `Workflow`: id, request_id, status, plan_version, parent_workflow_id.
- `Task`: id, workflow_id, department_id, agent_id, title, inputs_ref, outputs_ref, dependencies, status, due_at.
- `Proposal`: id, workflow_id, version, action_summary, target, risk, payload_hash, status.
- `Approval`: id, proposal_id, proposal_version, approver_id, decision, decided_at.
- `Execution`: id, proposal_id, idempotency_key, tool_name, status, started_at, finished_at, result_ref.
- `AuditEvent`: id, actor_type, actor_id, event_type, entity_ref, timestamp, evidence_ref.
- `KnowledgeSource`: id, provider, source_id, canonical_url, version, fetched_at, trust_label.

Notion pages and databases are referenced, not copied wholesale into a second task system. PostgreSQL is the proposed store for identity-linked workflow, approval, execution, and audit metadata. Confirm hosting and cost constraints before selecting the production database provider.

## 7. Target technical architecture

- **Frontend:** migrate incrementally from the current static PWA to Next.js + TypeScript only when the first Company OS feature requires shared authenticated server state. Preserve phone-first interaction and existing URLs.
- **Backend:** server-side API/orchestration layer. Reuse the current Cloudflare Worker as the initial secure adapter boundary; split services only when scale or deployment constraints justify it.
- **Authentication:** managed authentication with server-side session validation. The current shared app bearer key is a transitional single-user mechanism, not a multi-user identity system.
- **Operational database:** PostgreSQL for workflows, proposals, approvals, executions, and audit metadata. Do not mirror the Notion task database.
- **Knowledge:** Notion read-only integration initially; use source-scoped retrieval and bounded pagination.
- **Model layer:** provider adapter with structured outputs, schema validation, timeouts, usage limits, and explicit model/provider status. Never claim an agent or model ran when it did not.
- **Observability:** structured logs, correlation IDs, agent/model/tool usage, errors, and verification outcomes. Exclude secrets and unnecessary sensitive client data.

Provider and hosting choices must be checked against the user's zero-budget preference before enabling billing. No paid service, billing account, or paid feature may be enabled without explicit approval. Do not promise any service will remain free forever.

## 8. Security and autonomy levels

| Level | Capability | Default |
|---|---|---|
| L0 | Read approved knowledge and public/internal records within scope | Allowed |
| L1 | Draft plans, content, summaries, and proposed changes | Allowed |
| L2 | Prepare external actions and request approval | Allowed |
| L3 | Execute a specifically approved action once | Approval required |
| L4 | Recurring or bulk execution | Disabled until separately designed and explicitly approved |

Additional controls:
- Least privilege per agent and connector.
- Secrets only in server-side secret stores.
- Validate all inputs and outputs against schemas.
- Treat user content and retrieved documents as data, not policy.
- Prevent prompt injection from changing tools or permissions.
- Separate read and write connector capabilities.
- No arbitrary URL, database ID, or tool-name execution from model output.
- Audit every approval and execution.
- Provide pause/kill switch for all agent execution.

## 9. Implementation sequence

### Phase 0 — Audit and preservation
- Preserve the existing PWA, read-only Notion adapter, AI classifier, and tests.
- Resolve documentation inconsistencies (root README currently describes older capabilities).
- Verify current deployed Worker and Pages runtime separately from repository CI results.

### Phase 1 — Company foundation
- Add department registry and department workspace navigation.
- Add agent registry with explicit contracts and disabled-by-default execution.
- Add Company Brain source catalog and read-only retrieval contracts.
- Add workflow/task/proposal state model and audit event schema.
- Build the CEO command center with transparent routing and approval queue.

### Phase 2 — Orchestration
- Implement server-side orchestrator with structured plans.
- Add department routing and dependency-aware handoffs.
- Add clarification and failure handling.
- Keep all external writes disabled.

### Phase 3 — Approval and persistence
- Add managed authentication and PostgreSQL metadata store after cost/provider review.
- Enforce immutable approvals, idempotency, audit events, and kill switch.
- Add tests for unauthorized, stale, duplicate, and malformed actions.

### Phase 4 — Read-only Company Brain
- Expand approved Notion sources beyond Tasks Tracker only after schema and permissions review.
- Add retrieval citations, freshness metadata, and access boundaries.
- Test prompt-injection resistance.

### Phase 5 — Controlled execution
- Enable one low-risk connector action at a time.
- Require explicit per-action approval and read-after-write verification.
- Expand only after test evidence and operational review.

### Phase 6 — Department expansion
- Add specialist agents based on actual recurring workloads.
- Measure accuracy, completion, latency, cost, escalation rate, and human correction rate.
- Do not optimize for agent count.

## 10. Phase 1 acceptance criteria

- Seven departments have stable IDs, mandates, and clear ownership.
- Every agent has a versioned contract, scoped tools, and evaluation cases.
- The CEO workspace shows request status, department ownership, task dependencies, and approval state.
- Company Brain references approved sources and exposes source/freshness metadata.
- No model output can execute an external action directly.
- All write-capable actions remain disabled.
- Existing task planning, read-only Notion retrieval, PWA navigation, and current tests continue to work.
- CI validates the new registry schemas and existing app/Worker tests.
