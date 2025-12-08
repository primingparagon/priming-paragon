# Security Policy — Priming Paragon

This repository (Priming Paragon) follows a responsible disclosure policy and a standard security posture designed to detect, mitigate, and remediate supply-chain and repository compromise quickly. If you discover a security issue, please report it immediately following the steps below.

If you discover a vulnerability, please submit it via GitHub Private Vulnerability Reporting and aneyb@icloud.com.  
Do not disclose publicly.  
We will respond within 48 hours (maximum).

## Contact & Reporting
- Preferred: email primingparagons@gmail.com with subject: **SECURITY REPORT — [short summary]**
- Include: affected repository path, steps to reproduce, PoC (if safe), timestamps, and your contact method.
- For urgent / active compromise: add **[SECURITY]** to the subject line.

If you prefer encrypted reports, use the project's PGP key (publish to keyservers or request via email). If you do not have a secure way to share PoC files, upload to a password-protected artifact and share the password over email.

## What to include in a report
1. A description of the vulnerability and impact.
2. Exact steps to reproduce (minimal PoC).
3. Repo path(s) and commit SHAs involved.
4. Any observed attacker infrastructure (domains, IPs).
5. Whether credentials or secrets were exfiltrated.

## Triage & Response SLA
- Acknowledgement: within 24 hours.
- Initial triage & scope estimate: within 48 hours.
- Action plan & mitigation: within 5 business days (or sooner if high severity).
- Full remediation plan (including root cause): within 14 days for critical vulnerabilities.

## Severity classification (example)
- Critical: Remote RCE, repo secret exfiltration, compromised CI/CD credentials.
- High: Auth bypass, privilege escalation, exposed production API keys.
- Medium: Privilege-limited data exposure, persistent XSS in admin tooling.
- Low: Minor info disclosure, non-exploitable issues.

## Immediate steps for reporters (if you believe the repo or services are actively compromised)
1. DO NOT post public details or PoC.
2. Email primingparagons@gmail.com with details and subject "[SECURITY]".
3. If you have proof-of-exploit, include minimal reproduction steps only.
4. If you are collaborating with law enforcement, include a contact or reference.

## Maintainer actions when receiving a report
1. Create a private issue labeled `security` and assign owner.
2. Snapshot affected repo state (mirror clone) for forensics.
3. Rotate exposed keys, tokens, and secrets immediately.
4. Disable CI/CD and self-hosted runners until safe.
5. Patch code, run full CI checks, and require signed commits for fix merges.
6. Publish a disclosure timeline once mitigated (with reporter permission).

## Preventive Controls (what we already enforce / recommend)
- Require 2FA and hardware security keys for all org admins.
- Branch protection: required status checks, required reviews, disallow force pushes.
- Push protection & secret scanning (GitHub Advanced Security).
- Dependabot / SCA and CodeQL scanning on PRs.
- CI runs CodeQL, security linters, and gitleaks for each PR.
- No committed `node_modules` or binary large objects in repo.
- Strict Actions allow-list; pin third-party actions to specific SHAs.
- Least-privilege service tokens; short-lived credentials preferred.
- Periodic pentests & SCA scans (monthly).

## Forensics & evidence preservation
- Maintain a forensic mirror: `git clone --mirror git@github.com:org/repo.git`
- Hash and store snapshots off-line (SHA256).
- Save GitHub audit logs, CI logs, and runner logs.
- Do not rewrite history until you have offline evidence and a remediation plan.

## Disclosure & credits
- We will credit reporters unless they request anonymity.
- Bugs that are responsibly disclosed and actionable may qualify for bounty/recognition.

---

If you find possible secrets in the repo (API keys, OAuth tokens, SSH keys), treat them as **compromised** and rotate immediately. Contact primingparagons@gmail.com for assistance with key rotation playbooks.
