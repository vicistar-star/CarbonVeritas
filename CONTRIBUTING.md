# Contributing to CarbonVeritas

Thanks for your interest in contributing! This guide covers everything you need to get started.

> **Security issues** go to security@carbonveritas.io — not GitHub Issues. See [SECURITY.md](./SECURITY.md).

## Table of Contents

1. [First-Time Contributors](#first-time-contributors)
2. [Development Setup](#development-setup)
3. [Branch Naming](#branch-naming)
4. [PR Process](#pr-process)
5. [Code Style](#code-style)
6. [Commit Messages](#commit-messages)
7. [Testing Expectations](#testing-expectations)

---

## First-Time Contributors

New to the project? Start here.

**Good first issues** are labelled [`good first issue`](https://github.com/your-org/carbonveritas/labels/good%20first%20issue) on GitHub. These are intentionally scoped to a single file or module and don't require deep protocol knowledge.

**Before you open a PR for a non-trivial change**, open a GitHub Issue first to discuss the approach. This is especially important for:
- Smart contract changes (bugs can be irreversible on mainnet)
- New API endpoints or breaking schema changes
- Changes to authentication or authorization logic

**Not sure where to start?** Join [Discord](https://discord.gg/carbonveritas) and ask in `#dev-contributors`.

---

## Development Setup

See the [Quick Start](./README.md#quick-start) in the README for one-click bootstrap.

### Prerequisites

- Node.js 20+
- Rust 1.75+ with `wasm32-unknown-unknown` target
- Soroban CLI 21.0.0
- Docker + Docker Compose
- Freighter Wallet (browser extension, for frontend testing)

### Verify your setup

```bash
./scripts/bootstrap.sh   # one-click local setup
npm run doctor           # checks all services, contracts, and config
```

---

## Branch Naming

| Prefix | Purpose |
|--------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `chore/` | Maintenance, deps, tooling |
| `docs/` | Documentation only |
| `refactor/` | Code restructuring |
| `test/` | Adding or updating tests |
| `security/` | Security-related fixes |

Examples: `feat/multi-sig-admin`, `fix/merkle-proof-edge-case`, `chore/update-soroban-sdk`

---

## PR Process

1. Create a feature branch from `main`.
2. Make your changes, including tests.
3. Run the verification suite (see [Testing Expectations](#testing-expectations)).
4. Open a PR against `main` using the [PR template](./.github/PULL_REQUEST_TEMPLATE.md).
5. Request review from at least one maintainer.
6. Squash-merge after approval.

### Reviewer Checklist

- [ ] Contracts compile and all tests pass
- [ ] API/CLI/SDK tests pass and coverage gate is met
- [ ] No new `unwrap()` or unsafe patterns introduced
- [ ] Inline comments explain non-obvious logic
- [ ] Events emitted for all state mutations
- [ ] Error codes used from shared enum (not ad-hoc strings)
- [ ] Documentation updated if applicable

---

## Code Style

### Rust (Soroban Contracts)

- Use `#![no_std]` and avoid `alloc` unless necessary.
- Use `panic_with_error!` with the shared `Error` enum — never raw `panic!`.
- Emit events for all state-changing operations.
- Validate all inputs at entry points; assume nothing from callers.
- Storage keys use typed compounds, not string concatenation.
- No `unwrap()` in production code — use `?` or explicit `match`.
- Error codes must be in the 100–599 range; document in `shared/src/errors.rs`.

### TypeScript (API, SDK, CLI, Frontend)

- Strict mode enabled; no `any` without explicit justification.
- Use `class-validator` DTOs for all API input.
- Prefer `const` and `readonly`. Use `as const` for literal types.
- Use Zod for SDK runtime validation.
- Frontend components must meet WCAG 2.1 AA accessibility requirements.

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer: references issues or breaking changes]
```

**Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `security`

**Scopes:** `contracts`, `api`, `frontend`, `sdk`, `cli`, `indexer`, `infra`

Examples:
- `feat(contracts): add revenue-split distribute function`
- `fix(api): handle expired JWT gracefully`
- `docs(sdk): add retirement batch example`
- `chore(deps): bump soroban-sdk to 21.0.0`

---

## Testing Expectations

All tests must pass before a PR can be merged.

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Smart Contracts | `cargo test` | ≥ 90% |
| API (unit) | Jest | ≥ 80% |
| API (e2e) | Jest + Supertest | Critical paths |
| Frontend | Playwright | ≥ 70% |
| SDK | Jest | ≥ 80% |

### Run the full suite

```bash
# Smart contracts
cargo test --workspace

# All Node packages
npm run test --workspaces

# Or individually
npm run test:api
npm run test:frontend
```

New features must include tests. Bug fixes must include a regression test that would have caught the bug.
