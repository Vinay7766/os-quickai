# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest release (v1.0.x) | ✅ Active support |
| Older versions | ❌ Please upgrade |

---

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities as public GitHub Issues.**

If you discover a security vulnerability in Quickno, please report it
privately so we can fix it before it becomes a public risk.

### How to Report

**Email:** [your-email@example.com]
**Subject line:** `[SECURITY] Quickno - Brief description`

Please include:
1. A description of the vulnerability
2. Steps to reproduce it
3. Potential impact
4. Your suggested fix (optional)

### What to Expect

- **Acknowledgement:** Within 48 hours
- **Status update:** Within 7 days
- **Fix timeline:** Within 30 days for critical issues

We will credit you in the release notes (unless you prefer to remain anonymous).

---

## Security Architecture

Quickno is designed with a local-first, privacy-first architecture:

- **No backend servers** — all processing happens on your machine
- **API keys stored in Windows Credential Manager** — never in plain text files
- **Direct HTTPS calls** — your queries go from your machine to the AI provider with no intermediary
- **No telemetry** — no data is sent to the developer
- **Update checks via GitHub API** — unauthenticated public requests only, no personal data sent

---

## Known Limitations

- API keys stored in Windows Credential Manager are protected by your Windows
  user account. If your Windows account is compromised, API keys may be at
  risk. Use strong Windows login credentials.
- The app queries the GitHub Releases API on launch to check for updates. This
  is an unauthenticated request with no personal data. You can disable this in
  a future settings option.

---

## Hall of Fame

Security researchers who responsibly disclose vulnerabilities will be credited here.

*(None yet — be the first!)*
