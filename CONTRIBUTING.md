# Contributing to OS QuickAI ✦

First off, thanks for taking the time to contribute! Contributions are what make the open source community such an amazing place.

## 🏁 Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/os-quickai.git
   ```
3. **Set up the development environment**:
   - Install [Rust](https://www.rust-lang.org/tools/install).
   - Install [Node.js](https://nodejs.org/) (v18+).
   - Install [pnpm](https://pnpm.io/installation).
   - Run `pnpm install`.

4. **Verify the build**:
   ```bash
   pnpm tauri dev
   ```

## 🛠 Project Structure

- `src/`: React frontend (Vite + Tailwind).
  - `components/`: Reusable UI elements.
  - `hooks/`: Custom React hooks (Theme, State, Update logic).
  - `windows/`: Entry points for separate windows (Overlay, Settings, Guide).
  - `store/`: State management (Zustand).
- `src-tauri/`: Rust backend.
  - `src/main.rs`: Window management, shortcuts, and tray logic.
  - `tauri.conf.json`: App configuration.

## 📝 Coding Standards

- **React**: Use functional components and hooks. Prefer CSS variables for theme colors.
- **Rust**: Follow standard Rust naming conventions. Use `Clippy` to check for lints.
- **PRs**: Keep pull requests focused on a single change. Reference any related issues.

## 🐞 Bug Reports & Feature Requests

If you find a bug or have a feature idea, please open an **Issue** first. This allows the community to discuss it before you start coding.

Thank you for contributing!
