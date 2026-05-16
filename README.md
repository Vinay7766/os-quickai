<div align="center">
  <img src="app-icon.svg" width="80" alt="Quickno Logo" />
  <h1>Quickno</h1>
  <p><strong>A lightning-fast, AI-powered global search assistant for Windows</strong></p>
  <p><a href="https://www.quickno.in/">www.quickno.in</a></p>
  <p>Summon it from anywhere with a hotkey. Ask anything. Open results in your favourite browser or AI.</p>

  <br/>

  [![GitHub release](https://img.shields.io/github/v/release/Vinay7766/quickno?style=flat-square&color=6366f1)](https://github.com/Vinay7766/quickno/releases/latest)
  [![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue?style=flat-square)](LICENSE)
  [![Privacy: Local Only](https://img.shields.io/badge/Privacy-Local%20Only-green?style=flat-square)](PRIVACY_POLICY.md)
  [![Built with Tauri](https://img.shields.io/badge/Built_with-Tauri_v2-blue?style=flat-square)](https://tauri.app)
  [![Platform: Windows](https://img.shields.io/badge/Platform-Windows_10%2F11-0078D4?style=flat-square&logo=windows)](https://github.com/Vinay7766/quickno/releases/latest)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)
  [![Terms of Use](https://img.shields.io/badge/Terms-of%20Use-lightgrey?style=flat-square)](TERMS_OF_USE.md)
  [![Join Tools Community](https://img.shields.io/badge/Discord-Join%20Now-7289da.svg?style=flat-square&logo=discord)](https://discord.gg/29a3qkEsX)
</div>

---

## Features

| Feature | Details |
|---|---|
| **Global Hotkey** | Press Alt+A (customisable) to summon the assistant from any app |
| **Built-in AI** | High-performance answers powered by free models — no key needed |
| **Local AI (Ollama)** | Run Llama 3, Mistral, and more entirely on your own machine |
| **Terminal Mode** | Run shell commands directly from the assistant palette |
| **Site Launcher** | Instantly launch ChatGPT, Claude, Gemini, or Grok with your query |
| **Deep Browser Sync** | Search Google, Bing, or Perplexity with a single keyboard shortcut |
| **Internal Browser** | Optional built-in browser to view results without leaving the assistant |
| **BYOK Support** | Enter your own API keys for GPT-4o, Claude 3.5, and more |
| **Privacy First** | API keys stored in Windows Credential Manager — never logged |
| **Ultra-Lightweight** | Built with Tauri (Rust) for minimal RAM usage and instant startup |

---

## Installation

### Option 1 — Download Installer (Recommended)

> No setup required. Works on Windows 10 and Windows 11 (64-bit).

1. Go to the [Latest Release](https://github.com/Vinay7766/quickno/releases/latest)
2. Download Quickno_x64_en-US.msi
3. Double-click the MSI file and follow the installer
4. Quickno appears in your system tray — press Alt+A to start

### Option 2 — Updating from a Previous Version

> The installer supports silent in-place upgrades — no need to uninstall first.

1. Go to the [Latest Release](https://github.com/Vinay7766/quickno/releases/latest)
2. Download the new .msi file
3. Run it — the installer automatically updates your existing installation
4. Restart the app from the system tray

### Option 3 — Build from Source

> Requires: [Node.js 20+](https://nodejs.org), [Rust (stable)](https://rustup.rs), [pnpm](https://pnpm.io), [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)

```bash
# 1. Clone the repository
git clone https://github.com/Vinay7766/quickno.git
cd quickno

# 2. Install frontend dependencies
pnpm install

# 3. Run in development mode
pnpm tauri dev

# 4. Build a release MSI
pnpm tauri build
# Output: src-tauri/target/release/bundle/msi/
```

---

1. **Launch** — Quickno runs in the system tray (near the clock).
2. **Summon** — Press **Alt + A** to open the palette.
3. **Ask** — Type and press **Enter** for AI answers.
4. **Search** — Press **Alt + Enter** for web search.
5. **Direct AI** — Press **Ctrl + Enter** for AI sites (ChatGPT, etc).

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| **Alt + A** | Summon / hide the assistant (Customisable) |
| **Enter** | Get AI answer (or run command in Terminal Mode) |
| **Alt + Enter** | Search query in your web browser |
| **Ctrl + Enter** | Launch query in your selected AI site |
| **Escape** | Clear result / Hide assistant |
| **Shift + Enter** | Add a new line to your query |
| **Ctrl + 1-4** | Switch between Search, Site, App, and Terminal modes |
| **/** | Focus the input field |

---

## Settings

Right-click the system tray icon → **Settings** to customize:
- **Models** — Use Free AI, Local **Ollama**, or your own API keys.
- **Modes** — Toggle **Terminal Mode** and **App Launcher**.
- **Interface** — Set default search engine, browser, and themes (Light/Dark).
- **Hotkeys** — Change the global summon shortcut.

---

## Privacy & Security

- Your API key is stored only in Windows Credential Manager (hardware-backed, never in plain text)
- Queries are not logged anywhere
- Free model queries are routed through Pollinations.ai (public proxy) — no personal data or API keys attached
- The app never phones home except for optional update notifications from GitHub Releases API

---

## Contributing

We love contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

Quick summary:
- Bug reports → [Open an Issue](https://github.com/Vinay7766/quickno/issues/new?template=bug_report.md)
- Feature requests → [Open an Issue](https://github.com/Vinay7766/quickno/issues/new?template=feature_request.md)
- Code contributions → Fork → branch → PR

---

## License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
