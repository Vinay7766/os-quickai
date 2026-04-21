# Third-Party Notices

OS QuickAI uses or supports the following third-party AI models and
open-source components. Their licenses and required attributions are listed below.

---

## AI Models

### 1. MiniMax M2 / M2.5
- **Developer:** MiniMax (Shanghai, China)
- **License:** MIT License
- **License text:** https://github.com/MiniMax-AI/MiniMax-M2/blob/main/LICENSE
- **Attribution:** Copyright © MiniMax. Licensed under MIT.

### 2. Qwen3 Series (qwen-3.6)
- **Developer:** Alibaba Cloud
- **License:** Apache License 2.0
- **License text:** https://github.com/QwenLM/Qwen3/blob/main/LICENSE
- **Attribution:** Copyright © Alibaba Cloud. Licensed under Apache 2.0.
- **Note:** Qwen3 models are fully permissive for commercial use under Apache 2.0.

### 3. NVIDIA Nemotron
- **Developer:** NVIDIA Corporation
- **License:** NVIDIA Nemotron Open Model License
- **License text:** https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-nemotron-open-model-license/
- **Attribution:** Licensed by NVIDIA Corporation under the NVIDIA Nemotron Open Model License.
- **Note:** Commercial use is permitted. NVIDIA does not claim ownership of outputs generated using the models.

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

Full dependency list with exact versions is in `pnpm-lock.yaml`.

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

Full dependency list with exact versions is in `src-tauri/Cargo.lock`.

---

## Windows APIs Used

This application uses the following Microsoft Windows APIs:
- **Windows Credential Manager** — for secure local API key storage
- **Windows Clipboard API** — for clipboard write (copy button)
- **Windows Global Hotkey API** — for the global shortcut
- **WebView2 Runtime** — for rendering the UI (Microsoft Edge WebView2)

These are standard public Microsoft APIs. WebView2 is subject to the
[Microsoft Software License Terms for Microsoft Edge WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

---

## Attribution Requirements Summary

| Component | Requirement |
|-----------|------------|
| MiniMax M2/M2.5 | Include MIT license notice in distributed copies |
| Qwen3 | Include Apache 2.0 notice in distributed copies |
| NVIDIA Nemotron | Include NVIDIA Nemotron Open Model License notice |
| OS QuickAI source code | MIT (see LICENSE) |
