# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x (alpha) | Security patches only |

## Reporting a Vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

Report privately to **security@carbonveritas.io** with the following information:

- Type of issue (e.g., reentrancy, double-mint, privilege escalation)
- Full paths of source file(s) related to the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact assessment, including how an attacker might exploit it

### Response Timeline

| Stage | Target |
|-------|--------|
| Initial acknowledgment | 24 hours |
| Assessment & confirmation | 7 days |
| Remediation plan | 30 days |
| Public disclosure | 90 days |

We request that you give us reasonable time to investigate and fix the issue before public disclosure, and make a good faith effort to avoid privacy violations and data destruction.

## Bug Bounty

| Severity | Criteria | Reward |
|----------|----------|--------|
| **Critical** | Fund loss, double-mint, unauthorized minting | Up to $50,000 USDC |
| **High** | Data integrity violation, auth bypass | Up to $15,000 USDC |
| **Medium** | Denial of service, information leak | Up to $3,000 USDC |

Rewards are paid at the discretion of the security team based on impact and quality of the report.

## PGP Key

```
-----BEGIN PGP PUBLIC KEY BLOCK-----

For security-related correspondence, please use our PGP key:
Fingerprint: 0000 0000 0000 0000 0000  0000 0000 0000 0000 0000
Key ID: 0x0000000000000000
Available at: https://carbonveritas.io/security.pgp
-----END PGP PUBLIC KEY BLOCK-----
```

## Audit History

| Contract | Auditor | Status | Report |
|----------|---------|--------|--------|
| CreditRegistry | Trail of Bits | ✅ Complete (Dec 2025) | [View](docs/audits/trail-of-bits-credit-registry.pdf) |
| RetirementTracker | Sigma Prime | ✅ Complete (Dec 2025) | [View](docs/audits/sigma-prime-retirement.pdf) |
| Marketplace | Hacken | 🔄 In Progress (Q1 2026) | Pending |
| MerkleBridge | Certora (formal verification) | 📅 Scheduled (Q2 2026) | Pending |
| RevenueSplit | OtterSec | 📅 Scheduled (Q2 2026) | Pending |
| VerifierStake | Trail of Bits | 📅 Scheduled (Q2 2026) | Pending |
