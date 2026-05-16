# Contributing to Quickno

First off, thanks for taking the time to contribute! Contributions are what make the open source community such an amazing place.

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/quickno.git
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

## Project Structure

- `src/`: React frontend (Vite + Vanilla CSS).
  - `assets/`: Images, logos, and animations.
  - `components/`: Core UI components (QueryInput, Results, etc).
  - `hooks/`: Custom React hooks (Update logic, etc).
  - `lib/`: Shared utilities and native command wrappers.
  - `windows/`: Distinct window entry points (Overlay, Settings).
  - `store/`: Zustand state stores (App, Settings).
- `src-tauri/`: Rust backend.
  - `src/main.rs`: App initialization and tray logic.
  - `src/commands/`: Modularized logic (LLM, Settings, Terminal, Browser).
  - `src/error.rs`: Centralized error handling and types.
  - `tauri.conf.json`: Tauri 2.0 configuration.

## Coding Standards

- **License**: All contributions must be compatible with the **Apache License 2.0**.

- **React**: Use functional components and hooks. Prefer CSS variables for theme colors.
- **Rust**: Follow standard Rust naming conventions. Use `Clippy` to check for lints.
- **PRs**: Keep pull requests focused on a single change. Reference any related issues.

## Bug Reports & Feature Requests

If you find a bug or have a feature idea, please open an **Issue** first. This allows the community to discuss it before you start coding.

Thank you for contributing!
