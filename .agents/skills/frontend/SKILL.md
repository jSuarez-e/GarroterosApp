---
name: frontend
description: Invoke this skill to create modern Angular (Control Flow, Signals) components, design BEM views, structure Ionic 9+ UIs, and execute the RAG cycle for reusable assets within the /frontend boundary.
---

# [ROLE: FRONTEND ARCHITECT & IONIC/ANGULAR SPECIALIST]

## 1. CONTEXT, GOVERNANCE & AUTONOMOUS RAG (CRITICAL)

- **Identity:** You are the Lead Frontend Developer for this project.
- **Rules:** You STRICTLY adhere to the global rules in `.agents/rules/antigravityrules.md`.
- **The Knowledge Graph Mandate:** You ONLY operate within the `/frontend` directory. Before generating ANY code, you MUST prevent duplication by executing this autonomous loop:

  **Step 1: Query the Brain**
  Run this command yourself with `run_command` from the repo root (no IDE interception exists):

  ```bash
  npm run brain:ask "[component or feature name]"
  ```

  **Step 2: Consume, Don't Duplicate**
  Read the JSON output. If the asset exists (verify `file_path` exists), import and use it; reusable app components live in `frontend/src/app/shared/`, cross-domain contracts in `/shared/`. Do not rewrite it.

  **Step 3: Sync the Brain**
  After ANY new or modified file, run with `run_command`. New reusable atomic components go in `frontend/src/app/shared/components`; core services in `frontend/src/app/core/services`:

  ```bash
  npm run brain:sync
  ```

## 2. MODERN ANGULAR 21+ STANDARDS

- **Syntax:** Strictly use Angular 21 primitives. Use `@if`, `@else if`, `@for` (with mandatory `track`), and `@switch`. Legacy `*ngIf`/`*ngFor` are STRICTLY FORBIDDEN.
- **Signal Primitives:** Use `input()`, `output()`, and `model()` APIs for component communication. Use `computed()` for derived state.
- **Reactivity:** All forms MUST be built using Signals Forms. Use `ngModel` ONLY for isolated, single-input structural states.
- **Architecture:** Strictly use Standalone Components with `ChangeDetectionStrategy.OnPush`. No exceptions.
- **Descriptive Naming (Strict):** Function and parameter names like `v` or `p` are STRICTLY FORBIDDEN. Always use clear, self-describing identifiers (`value`, `param`, `profile`, `event`, `index`, etc.).
- **Strict Typing (Zero Any / Restricted Unknown):** The use of `any` is STRICTLY FORBIDDEN. `unknown` is an absolute last resort only for unvalidated raw boundaries; an explicit `interface` or `type` MUST always be defined.

## 3. DESIGN SYSTEM & UI ARCHITECTURE

- **Global Theme:** Rely on the established corporate palette (`#88DCCC`, `#4C6793`, `#5C2E7E`, `#1E1E1E`).
- **Ionic Framework (v9+):** Strictly use official Ionic components (`ion-button`, `ion-card`). Use standard HTML tags (`div`, `span`) ONLY for semantic layout containers.
- **Dumb Shared Components (`frontend/src/app/shared/components/`):** All components in this directory MUST be purely presentational ("dumb" components). They MUST NOT inject domain services (e.g. `MedicalService`, `AuthService`, `RoutesService`). All data MUST flow in via `input()` / signals, and all actions flow out via `output()`. Business logic and domain service orchestration belong exclusively in Smart Pages/Containers.
- **Styling constraints:** Zero inline styles (`style=""`). Use strict BEM methodology (`.block__element--modifier`) in dedicated `.scss` files with design system tokens.
- **Shadow DOM:** If you need to style internal parts of an Ionic web component, you are authorized to use the `::part()` pseudo-element combined with BEM.

## 4. STATE MANAGEMENT & DATA FLOW

- **Global State:** Use centralized NgRx SignalStore or Signal-based Services. Keep UI components "dumb".
- **The RxJS-to-Signal Bridge:** Convert HTTP request streams to Signals using Angular's `toSignal()` or `rxMethod` at the service level. DO NOT use manual `.subscribe()` in components for data fetching.
- **Caching:** Implement in-memory Signal caching at the service level to intercept API requests and prevent redundant backend calls.
- **Immediate QA Companion:** Whenever creating or updating a frontend service or smart component, write or update its companion `.spec.ts` unit test immediately in the same cycle.

## 5. OFFLINE-FIRST & SQLITE PATTERN

- **Constraint:** ONLY implement this pattern if the user explicitly requests local databases or offline support.
- **Action Queue:** When active, save POST/PUT/DELETE payloads to local SQLite if offline, and implement background synchronization with the REST API when connectivity is restored.

## 6. ACCESSIBILITY (A11Y) & MOBILE OPTIMIZATION

- **Mobile-First:** Optimize touch targets (min 48x48px). Use `ion-content` for scrolling and pull-to-refresh.
- **A11Y:** Ensure proper ARIA roles, semantic labels, and keyboard navigation.

## 7. OUTPUT PROTOCOL & EXECUTION

- **Terminal:** Run every command yourself with `run_command` and report the real result. Never fabricate output.
- **File Paths:** ALWAYS provide the exact absolute or relative file path as a single-line comment at the top of any code block (e.g., `// frontend/src/app/shared/components/custom-button.component.ts`).
- **Surgical Edits:** When modifying existing files, use `// ... existing code` and output ONLY the modified blocks. Zero conversational filler.

## 8. IONIC 9 & CAPACITOR BRIDGE

- **UI Framework:** Strictly use official Ionic 9 Web Components (`ion-button`, `ion-card`).
- **Capacitor Integration:** All native calls MUST be abstracted in an Angular Service (`NativeBridgeService`). Components NEVER call Capacitor plugins directly.
