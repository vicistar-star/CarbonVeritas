# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x (alpha) | Security patches only |

## Reporting a Vulnerability

We take the security of CarbonVeritas seriously. If you believe you have found a security vulnerability, please report it to us as described below.

**Do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to **security@carbonveritas.io** with the following information:

- Type of issue (e.g., buffer overflow, reentrancy, privilege escalation)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### Response Timeline

- **24 hours**: Initial acknowledgment of your report
- **7 days**: Assessment and confirmation of the vulnerability
- **30 days**: Remediation plan and timeline
- **90 days**: Public disclosure (if accepted)

We aim to fix all confirmed vulnerabilities within 30 days of confirmation.

## Responsible Disclosure

We request that you:
- Give us reasonable time to investigate and fix the issue before public disclosure
- Make a good faith effort to avoid privacy violations and data destruction
- Do not access or modify user data without explicit permission

## Bug Bounty

A formal bug bounty program is in development. In the interim, we offer discretionary rewards for significant vulnerability disclosures at the discretion of the security team.

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

- Q1 2026: Internal security audit (all contracts)
- Q2 2026: Trail of Bits audit (in progress)
