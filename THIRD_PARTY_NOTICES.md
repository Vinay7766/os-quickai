# Third-Party Notices

Quickno uses or supports the following third-party AI models and
open-source components. Their licenses and required attributions are listed below.

---

## AI Models

### 1. OpenAI Fast (via Pollinations.ai)
- **Developer:** OpenAI / Pollinations AI
- **License:** MIT / Apache 2.0 (via Pollinations API)
- **Note:** Quickno uses the Pollinations.ai public proxy to provide free access to high-performance LLMs without requiring a personal API key.

### 2. Gemini / Claude / ChatGPT / Grok / Perplexity (BYOK)
- **Note:** These models are supported via the 'Bring Your Own Key' (BYOK) system. Their use is subject to the respective provider's terms of service and privacy policies.

---

## Frontend Dependencies (npm)

| Package | Version | License |
|---------|---------|---------|
| react | ^18 | MIT |
| react-dom | ^18 | MIT |
| zustand | ^4 | MIT |
| lucide-react | latest | ISC |
| tailwindcss | ^3 | MIT |
| vite | ^6 | MIT |
| typescript | ^5 | Apache 2.0 |
| @tauri-apps/api | ^2 | Apache 2.0 / MIT |
| @tauri-apps/plugin-store | ^2 | Apache 2.0 / MIT |
| @tauri-apps/plugin-shell | ^2 | Apache 2.0 / MIT |
| @tauri-apps/plugin-clipboard-manager | ^2 | Apache 2.0 / MIT |
| @tauri-apps/plugin-global-shortcut | ^2 | Apache 2.0 / MIT |

---

## Rust / Backend Dependencies

| Crate | License |
|-------|---------|
| tauri | MIT / Apache 2.0 |
| serde | MIT / Apache 2.0 |
| serde_json | MIT / Apache 2.0 |
| tokio | MIT |
| reqwest | MIT / Apache 2.0 |
| keyring | MIT / Apache 2.0 |
| winreg | MIT |
| thiserror | MIT / Apache 2.0 |
| urlencoding | MIT |
| open | MIT |

---

## Windows APIs Used

This application uses the following Microsoft Windows APIs:
- **Windows Credential Manager** — for secure local API key storage
- **Windows Clipboard API** — for clipboard write (copy button)
- **Windows Global Hotkey API** — for the global shortcut
- **WebView2 Runtime** — for rendering the UI (Microsoft Edge WebView2)

---

## Attribution Requirements Summary

| Component | Requirement |
|-----------|------------|
| OpenAI Fast / Pollinations | Include attribution for free tier proxy services |
| Quickno source code | Apache 2.0 (see LICENSE) |
