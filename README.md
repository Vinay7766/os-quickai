# OS QuickAI ✦

**Seamless AI search overlay for Windows.**  
Fast, lightweight, and extensible. Summon an AI-powered search bar from anywhere with a single hotkey (`Alt + A`).

![Banner Placeholder](https://via.placeholder.com/1200x400?text=OS+QuickAI+✦)

## 🚀 Key Features

- **Global Summon**: Press `Alt + A` to bring up the AI assistant instantly over any application.
- **Smart Auto-Paste**: Automatically detects copied text and populates it into the search bar upon summoning.
- **Multi-Engine Support**: Toggle between local AI answers, browser searches (Google/Bing), or direct AI site redirects (ChatGPT/Claude).
- **Fast & Focused**: Minimalist design with glassmorphism aesthetics.
- **Privacy-First**: Your API keys are stored securely in the Windows Credential Manager.

## 🛠 Tech Stack

- **[Tauri v2](https://tauri.app/)** - Security-first desktop framework.
- **[React](https://react.dev/)** + **[TypeScript](https://www.typescriptlang.org/)** - For a responsive and clean UI.
- **[Rust](https://www.rust-lang.org/)** - For high-performance backend and system integrations.
- **[Tailwind CSS](https://tailwindcss.com/)** - Premium styling and layout.
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Fast state management.

## 📦 Installation

To download the latest stable version, visit the [Releases](https://github.com/kalan/os-quickai/releases) page.

1. Download the `os-quickai-x64.msi` installer.
2. Run the installer and follow the instructions.
3. Once running, find the icon in your system tray to configure your API keys.

## 💻 Development Setup

If you want to build OS QuickAI from source:

1. **Prerequisites**:
   - [Node.js](https://nodejs.org/) (v18+)
   - [Rust](https://www.rust-lang.org/tools/install)
   - [pnpm](https://pnpm.io/installation)

2. **Clone and Install**:
   ```bash
   git clone https://github.com/kalan/os-quickai.git
   cd os-quickai
   pnpm install
   ```

3. **Run Dev Mode**:
   ```bash
   pnpm tauri dev
   ```

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---
Created with ✦ by [Kalan](https://github.com/kalan).
