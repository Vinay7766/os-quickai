# Changelog

## [1.0.2] - 2026-05-13
### Added
- Explicit "Latest Version" status card in Settings > Support section.
- Centralized `appConstants.ts` for all magic URLs and UI theme tokens.
- Modularized Settings architecture with new `AIModelsSection`, `InterfaceSection`, and `SupportSection` components.

### Changed
- Refactored `Settings.tsx` to adhere to strict < 250 line architectural limit.
- Updated project version to v1.0.2 across all configuration files (package.json, tauri.conf.json, Cargo.toml).
- Promoted v1.0.2 to "Latest Release" on GitHub.

### Fixed
- Synchronized in-app update check logic with new v1.0.2 release status.
- Resolved "old version" confusion by ensuring GitHub Release page correctly identifies the latest build.

## [1.0.1] - 2026-05-11
### Added
- Unified BYOK AI management system.
- Modern interactive maintenance cards (Delete Keys, Factory Reset).
- Automated "Saved Changes" notification system.
- Real-time Ollama model pull progress and size tracking.
- First-run onboarding flow with Welcome Screen.
