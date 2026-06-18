# Contributing to CarbonVeritas

## Development Setup

See README.md [Quick Start](./README.md#quick-start) for one-click bootstrap.

### Prerequisites

- Node.js 20+
- Rust 1.75+ with `wasm32-unknown-unknown` target
- Soroban CLI 21.0.0
- Docker + Docker Compose
- Freighter Wallet (browser extension)

## Branch Naming

| Prefix | Purpose |
|--------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `chore/` | Maintenance, deps, tooling |
| `docs/` | Documentation only |
| `refactor/` | Code restructuring |
| `test/` | Adding or updating tests |

Examples: `feat/multi-sig-admin`, `fix/merkle-proof-edge-case`, `chore/update-soroban-sdk`

## PR Process

1. Create a feature branch from `main`.
2. Make your changes, including tests.
3. Run `npm run lint && npm run test && cargo test --workspace`.
4. Open a PR against `main` using the [PR template](./.github/PULL_REQUEST_TEMPLATE.md).
5. Request review from at least one maintainer.
6. Squash-merge after approval.

### Reviewer Checklist

- [ ] Contracts compile and all tests pass
- [ ] API/CLI/SDK tests pass
- [ ] No new `unwrap()` or unsafe patterns introduced
- [ ] Inline comments explain non-obvious logic
- [ ] Events emitted for all state mutations
- [ ] Error codes used from shared enum (not ad-hoc strings)

## Code Style

### Rust (Soroban Contracts)

- Use `#![no_std]` and avoid `alloc` unless necessary.
- Use `panic_with_error!` with shared `Error` enum — never raw `panic!`.
- Emit events for all state-changing operations.
- Validate all inputs at entry points; assume nothing.
- Storage keys use typed compounds, not string concat.

### TypeScript (API, SDK, CLI)

- Strict mode enabled; no `any` without explicit justification.
- Use `class-validator` DTOs for all API input.
- Prefer `const` and `readonly`. Use `as const` for literal types.
- Use Zod for SDK runtime validation.

### Commit Messages

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `audit`
Scopes: `contracts`, `api`, `frontend`, `sdk`, `cli`, `indexer`, `infra`

Examples:
- `feat(contracts): add revenue-split distribute function`
- `fix(api): handle expired JWT gracefully`
- `chore(deps): bump soroban-sdk to 21.0.0`

## Testing Expectations

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Smart Contracts | `cargo test` | > 90% |
| API (unit) | Jest | > 80% |
| API (e2e) | Jest + Supertest | Critical paths |
| Frontend | Playwright | > 70% |
| SDK | Jest | > 80% |

All tests must pass before merge. Run `cargo test --workspace && npm run test --workspaces` to verify.
