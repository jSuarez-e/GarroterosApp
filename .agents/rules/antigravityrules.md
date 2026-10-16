---
trigger: always_on
---

# [SYSTEM: GLOBAL GOVERNANCE & CORE DIRECTIVES]

## 1. CONTEXT & ENVIRONMENT (AGNOSTIC)

- **Environment:** Multi-agent Antigravity IDE environment (Architect, Frontend, Backend, QA, Debugger).
- **Core Stack:** FRAMEWORK-AGNOSTIC. The specific technologies, frameworks, and syntax rules are dictated EXCLUSIVELY by the active `SKILL.md` (Cartridge). You must confidently apply the stack defined in your active Skill without hesitation.
- **Workspace Structure:** Agents MUST respect domain boundaries defined by the architecture (e.g., Client, Server, Shared Contracts).

## 2. MULTI-AGENT BOUNDARIES & SHARED PROTOCOL (CRITICAL)

- **Domain Isolation:** Frontend-focused agents MUST NOT modify backend code. Backend-focused agents MUST NOT modify frontend code.
- **The Shared Directory:** All shared models, DTOs, and interfaces MUST live in the cross-domain shared folder. If an agent needs a new data structure spanning both ends, it must be created here FIRST (Design Phase).
- **Agent Handoff:** If a task requires changes outside an agent's domain, the agent MUST stop, output the necessary cross-domain requirements, and explicitly instruct the Orchestrator/User to invoke the correct agent.

## 3. SPEC-DRIVEN DEVELOPMENT (SDD) & ARCHITECTURE

- **Execution Authority:** You are empowered to execute the Specify, Design, Direct, Review (EDDR) lifecycle autonomously within your specific domain. Do not wait for external approval unless crossing domain boundaries.
- **Principles:** Strict adherence to Clean Architecture, Clean Code, SOLID, DRY, and KISS. Modules/Services must follow the Single Responsibility Principle (SRP).
- **Descriptive Naming (Strict):** Single-letter names like `v`, `p`, `x`, `e` for function parameters, variables, and methods are STRICTLY FORBIDDEN. Always use explicit, self-describing domain terms (e.g., `value`, `param`, `profile`, `event`, `index`), with exceptions reserved only for standard 2D/cartesian coordinates (`x`, `y`).
- **Strict Typing (Zero Any / Restricted Unknown):** The use of `any` is STRICTLY FORBIDDEN across the entire monorepo. `unknown` is permitted ONLY as an absolute last resort when dealing with unvalidated external inputs before type narrowing. An explicit `interface`, `type`, or strict generic MUST always be defined first.
- **Frontend Architecture & Dumb Shared Components:** All reusable components in `frontend/src/app/shared/components/` MUST be pure presentational ("dumb") components (data in via `input()` / signals, events out via `output()`). They MUST NEVER inject domain services. Inline styles (`style=""`) in HTML are STRICTLY FORBIDDEN; use strict BEM methodology (`.block__element--modifier`) and design tokens.
- **Commits:** Strictly adhere to Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`).

## 4. ERROR HANDLING, QA & SECURITY

- **Immediate QA Testing Mandate:** QA tests MUST NOT be deferred. Every new or modified service, controller, utility, or smart component MUST have companion unit/integration tests (`.spec.ts`) generated immediately in the same cycle before closing the task.
- **Backend/API Errors:** Follow a strict, unified JSON format (e.g., RFC 7807 Problem Details). NEVER expose raw database stack traces to the client.
- **Frontend Errors:** Centralize via client-side network interceptors and global Error Handlers. No raw `console.log` for critical errors.
- **Security:** Code must be SAST-ready (SonarQube/ESLint strict compliance). Zero tolerance for SQLi, XSS, or known vulnerabilities. Always validate unexpected inputs.

## 5. DOCUMENTATION & REUSABILITY (THE SDD HEADER)

- **Frontend:** Mandatory JSDocs for components, services, and complex logic.
- **Backend:** Mandatory Swagger/OpenAPI documentation for all REST endpoints.
- **Mandatory SDD Signature (NEW FILES ONLY):** EVERY **NEW** file you create MUST start with a block comment containing the `@sdd` tag. This is CRITICAL for the RAG system.
- **Existing Files:** When modifying existing files, DO NOT output or alter the existing header. Focus strictly on the required logic changes.
- **Domain Adaptation (For New Files):**

  **CASE A: Logic Files (Services, Controllers, DTOs, Entities)**
  /\*\*
  - @sdd
  - [Objetivo]: Business logic it solves.
  - [I/O]: Injected dependencies, payloads, and return types/endpoints.
  - [Edge Cases]: Security, null checks, error handling.
    \*/

  **CASE B: UI, Stylesheets & Shared Components (CSS, SCSS, HTML, UI Components)**
  /\*\*
  - @sdd
  - [Objetivo]: Visual, interactive, or structural purpose.
  - [I/O - Reusabilidad]: Explicitly list exported utility CSS classes, global CSS variables, or component Inputs/Outputs/Signals.
  - [Edge Cases - UI]: Responsive breakpoints, accessibility (a11y), or empty/loading states.
    \*/

## 6. TOKEN EFFICIENCY & ANTI-HALLUCINATION (MAXIMUM PRIORITY)

- **Zero Hallucination:** If you lack context, do not understand the requirement, or do not know the exact answer, DO NOT guess or invent code/libraries. STOP and explicitly ask the user for clarification.
- **Output Protocol:** NO conversational filler ("Here is the code", "Sure"). NO pleasantries. At task end, ALWAYS give a concise factual report (files changed, commands run with their result, gates passed/failed). Never claim completion without having run the Quality Gates (§9).
- **Surgical Code Modifications:** When modifying existing files, DO NOT output the entire file. You are STRICTLY FORBIDDEN from outputting unchanged code lines. Use `// ... existing code` and output ONLY the modified blocks wrapped in clearly commented target locations.
- **Terminal Execution Protocol:** You have full authorization to execute CLI commands autonomously using your internal `run_command` tool when scaffolding, installing dependencies, or performing system actions. Si encuentras errores de permisos (`PSSecurityException`), notifica al usuario o intenta solucionarlo mediante scripts absolutos.
- **Output Chunking Constraint:** If a code implementation exceeds 150 lines or risks hitting the token limit, you MUST split the output into progressive modular sub-tasks. No bloated monoliths.

## 7. SYSTEM DIAGNOSTICS & AUDIT PROTOCOL (OVERRIDE COMMAND)

- **The Audit Trigger:** If the user sends the exact string `/audit-agent` at any point, you MUST immediately halt all normal operations, skip code generation entirely, and output ONLY a strict JSON payload verifying your active context.
- **JSON Structure:**

  ```json
  {
    "status": "AUDIT_ACTIVE",
    "active_role": "[Identify your current role]",
    "domain_restriction": "[Identify your isolated directory]",
    "global_rules_loaded": true,
    "current_objective": "[Brief 1-sentence summary]"
  }
  ```

## 8. AUTONOMOUS RAG LIFECYCLE (CRITICAL IDE EXECUTION)

**ABSOLUTE DIRECTIVE:**
Whenever you receive a task to create, modify, analyze code, or resolve an issue, you MUST execute this 3-step lifecycle autonomously with your `run_command` tool. Never wait for permission to query the Brain. There is NO IDE interception of bash blocks: a command only runs if YOU run it with `run_command`.

**STEP 1: CONTEXT RETRIEVAL (PRE-HOOK)**

- BEFORE reading or writing code, run from the repo root:
  `npm run brain:ask "[task keywords]"` (use 1-3 specific keywords, e.g. component/service name).
- Read the JSON result. If an asset exists, REUSE it; never duplicate. Verify its `file_path` exists before trusting it.
- If `status` is `empty_project` or `not_found`, you are free to create it.

**STEP 2: EXECUTION (CODING)**

- Apply your specific `SKILL.md` (Cartridge) and all SDD constraints. Every NEW file MUST start with the `@sdd` header.

**STEP 3: SYNCHRONIZATION (POST-HOOK)**

- After creating or modifying files, run `npm run brain:sync` with `run_command`. Confirm it finished with `✅`.
- Do not skip this step, even for small changes.

## 9. CI/CD & QUALITY GATES (POST-DEVELOPMENT MANDATE)

**ABSOLUTE DIRECTIVE:**
Immediately after finishing a development task or fixing a bug, you MUST autonomously run the following gates with `run_command`. A gate that fails MUST be fixed before reporting completion.

**STEP 1: LINTING & VALIDATION**

- `npm run audit:all` (fails with non-zero exit code on any ESLint/Stylelint error).
- `npm run audit:rules` (fails on `any`, `*ngIf/*ngFor`, inline `style=""`, `.ts` files without `@sdd`).

**STEP 2: UNIT TESTING**

- `npm run test` from the repo root (runs backend and frontend suites).

**STEP 3: VERSIONING (ONLY ON EXPLICIT USER REQUEST)**

- `npm run release` MUST NOT run automatically. Run it ONLY when the user asks to cut a release.
