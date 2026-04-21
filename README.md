<div align="center">
  <img src="app-icon.svg" width="80" alt="OS QuickAI Logo" />
  <h1>OS QuickAI</h1>
  <p><strong>A lightning-fast, AI-powered global search assistant for Windows</strong></p>
  <p>Summon it from anywhere with a hotkey. Ask anything. Open results in your favourite browser or AI.</p>

  <br/>

  [![GitHub release](https://img.shields.io/github/v/release/Vinay7766/os-quickai?style=flat-square&color=6366f1)](https://github.com/Vinay7766/os-quickai/releases/latest)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
  [![Built with Tauri](https://img.shields.io/badge/Built_with-Tauri_v2-blue?style=flat-square)](https://tauri.app)
  [![Platform: Windows](https://img.shields.io/badge/Platform-Windows_10%2F11-0078D4?style=flat-square&logo=windows)](https://github.com/Vinay7766/os-quickai/releases/latest)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)
</div>

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔥 **Global Hotkey** | Press `Alt+A` (customisable) to summon the assistant from any app |
| 🤖 **Built-in AI** | Answers powered by free AI models — no API key needed to start |
| 🔑 **API Key Support** | Use your own OpenAI-compatible API key for premium models |
| 🌐 **Open in Browser** | Send your query to Google, Bing, Perplexity or DuckDuckGo |
| 💬 **Open in AI** | Launch ChatGPT, Claude, Gemini, Grok or Perplexity with your query |
| 📋 **Copy Answer** | One-click copy of the AI response to clipboard |
| 🎨 **Themes** | Light, Dark and System themes |
| 🔒 **Privacy First** | API keys stored in Windows Credential Manager — never logged |
| ⚡ **Tiny footprint** | ~5 MB install, instant launch, lives in the system tray |

---

## 📥 Installation

### Option 1 — Download Installer (Recommended)

> No setup required. Works on Windows 10 and Windows 11 (64-bit).

1. Go to the [**Latest Release**](https://github.com/Vinay7766/os-quickai/releases/latest)
2. Download **`OS.QuickAI_x64_en-US.msi`**
3. Double-click the MSI file and follow the installer
4. OS QuickAI appears in your system tray — press **`Alt+A`** to start

### Option 2 — Updating from a Previous Version

> The installer supports **silent in-place upgrades** — no need to uninstall first.

1. Go to the [**Latest Release**](https://github.com/Vinay7766/os-quickai/releases/latest)
2. Download the new **`.msi`** file
3. Run it — the installer automatically updates your existing installation
4. Restart the app from the system tray

### Option 3 — Build from Source

> Requires: [Node.js 20+](https://nodejs.org), [Rust (stable)](https://rustup.rs), [pnpm](https://pnpm.io), [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)

```bash
# 1. Clone the repository
git clone https://github.com/Vinay7766/os-quickai.git
cd os-quickai

# 2. Install frontend dependencies
pnpm install

# 3. Run in development mode
pnpm tauri dev

# 4. Build a release MSI
pnpm tauri build
# Output: src-tauri/target/release/bundle/msi/
```

---

## 🚀 Getting Started

1. **Launch** — OS QuickAI starts silently in the system tray (look for the icon near the clock)
2. **Summon** — Press **`Alt+A`** anywhere on your PC
3. **Ask** — Type your question and press `Enter` for an AI answer
4. **Search** — Click **Web** or press `Alt+Enter` to search in your browser
5. **Open AI** — Click **AI** or press `Ctrl+Enter` to open your preferred AI site
6. **Hide** — Press `Escape` or click anywhere outside the assistant

> 💡 Right-click the tray icon → **Settings** to change hotkeys, AI model, browser, and theme.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt + A` | Summon / hide the assistant (customisable) |
| `Enter` | Ask the built-in AI |
| `Alt + Enter` | Search in your web browser |
| `Ctrl + Enter` | Open query in AI site |
| `Escape` | Hide the assistant |

---

## ⚙️ Settings

Right-click the **system tray icon** → **Settings** to configure:

- **AI Model** — Choose from free models or enter your API key for GPT-4o, Claude, etc.
- **Browser** — Chrome, Firefox, Edge, Brave or your system default
- **Search Engine** — Google, Bing, DuckDuckGo, Perplexity
- **AI Site** — ChatGPT, Claude, Gemini, Grok, Perplexity
- **Hotkey** — Change the global shortcut to anything you like
- **Theme** — Light, Dark, or System

---

## 🛡️ Privacy & Security

- ✅ Your API key is stored **only** in **Windows Credential Manager** (hardware-backed, never in plain text)
- ✅ Queries are **not logged** anywhere
- ✅ Free model queries are routed through a public proxy — no personal data attached
- ✅ The app **never phones home** except for optional update notifications from GitHub Releases API

---

## 🤝 Contributing

We ❤️ contributions! See [**CONTRIBUTING.md**](CONTRIBUTING.md) to get started.

Quick summary:
- 🐛 **Bug reports** → [Open an Issue](https://github.com/Vinay7766/os-quickai/issues/new?template=bug_report.md)
- 💡 **Feature requests** → [Open an Issue](https://github.com/Vinay7766/os-quickai/issues/new?template=feature_request.md)
- 🔧 **Code contributions** → Fork → branch → PR

---

## 📄 License

[MIT](LICENSE) © 2024 Vinay7766 & Contributors
