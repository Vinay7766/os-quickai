# Privacy Policy

**Last updated:** April 2026
**App name:** Quickno
**Developer:** Vinay7766, India
**Contact:** highlowtemp2580@gmail.com
**GitHub:** https://github.com/Vinay7766/quickno

---

## 1. Overview

Quickno is a Windows desktop application that operates entirely on your
local machine. We do not operate any servers, we do not collect your data,
and we do not transmit any information to ourselves.

This Privacy Policy explains exactly what data the app accesses, why, and
what happens to it.

---

## 2. Data We Do NOT Collect

We want to be completely clear. The following data is **never** collected,
transmitted to us, stored on our servers, or shared with any third party
by Quickno:

- Your queries or questions
- Your AI responses
- Your API keys
- Your clipboard contents
- Your selected text
- Your name, email, or any personal identifiers
- Your device information or hardware specs
- Your usage patterns or frequency of use
- Any telemetry or analytics data

**We have no servers. There is nothing to collect data into.**

---

## 3. Data That Stays on Your Machine

The following data is stored **only on your local machine** and is never
transmitted to us:

| Data | Where Stored | Purpose |
|------|-------------|---------|
| API keys (BYOK) | Windows Credential Manager (OS keychain) | Used only for direct HTTPS calls to the LLM provider you configured |
| App settings (hotkey, preferences) | Local config file (`%APPDATA%\com.quickno.app\settings.json`) | Remembering your preferences between sessions |

You can delete all locally stored data at any time via **Settings → Data & Privacy → Delete API Key** or by uninstalling the application.

---

## 4. Third-Party AI Providers

When you use the AI features, your query text is sent **directly from your
device** to the AI provider you have configured. This communication is:

- Over HTTPS (encrypted in transit)
- Direct from your machine to the provider — we are not a middleman
- Governed by **the AI provider's own Privacy Policy**, not ours

Depending on your configuration, the provider receiving your query may be:

- **OpenAI** — https://openai.com/policies/privacy-policy
- **Anthropic** — https://www.anthropic.com/privacy
- **Google (Gemini)** — https://policies.google.com/privacy
- **MiniMax** — https://www.minimax.io/privacy
- **Perplexity** — https://www.perplexity.ai/privacy

**If you are using local/free models (minimax-2.5, qwen-3.6, nemotron),
your queries are routed through a public proxy. No personal data is attached.**

---

## 5. Clipboard and Selected Text

The clipboard paste feature works as follows:

1. You summon the assistant with the global hotkey
2. If text was previously copied to your clipboard, you may paste it manually
3. No clipboard content is read automatically or stored anywhere
4. No clipboard content is transmitted to us

---

## 6. Update Notifications

Quickno checks for updates by querying the **GitHub Releases API**
(`api.github.com/repos/Vinay7766/quickno/releases/latest`). This is a
public, unauthenticated request. GitHub's privacy policy applies:
https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement

No personal data is sent in this request.

---

## 7. Children's Privacy

This application is not directed at children under the age of 13. We do not
knowingly collect any data from children.

---

## 8. Your Rights Under Indian Law (DPDPA 2023)

Under India's Digital Personal Data Protection Act, 2023, you have the right
to know what data is processed about you. Since we collect no personal data,
there is nothing to access, correct, or delete on our end. For data sent to
third-party AI providers, please exercise your rights directly with those
providers using the links in Section 4.

---

## 9. Changes to This Policy

If we update this policy, we will update the "Last updated" date above and
post the new version in this file in the GitHub repository. Continued use of
the application after an update constitutes acceptance of the updated policy.

---

## 10. Contact

For privacy questions or concerns:
- Email: highlowtemp2580@gmail.com
- GitHub Issues: https://github.com/Vinay7766/quickno/issues

---

*This Privacy Policy applies to Quickno desktop application only. It does
not apply to any third-party services or AI providers that you choose to
connect to.*
