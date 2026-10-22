# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Native Rust domain logic for gamification (`compute_streak`, `compute_xp_gain`, `apply_streak_freeze`).
- Native Rust 10-minute study slot engine (`build_day_slots`).
- Native Rust schema validation and D-Day calculation (`validate_daily_sheet`, `compute_dday_remaining`) using `validator`.
- Typed IPC contract generation via `tauri-specta` v2 (`src/bin/export-bindings.rs` -> `src/types/bindings.ts`).
- Full Specta export for `SubjectItem` and `TimerConfig` native models.
- Dedicated `src/types/branded.ts` module with explicit consumer adapters (`asEntityId`, `asDateString`, `asHourValue`).

### Changed
- Replaced runtime raw Tauri `invoke` calls with typed `commands.*` in stores (`useGamificationStore`, `usePlannerStore`).
- Eliminated legacy TypeScript `Omit<>` wrappers in favor of direct re-exports from `./bindings`.
- Migrated build tooling and dependencies: Rust 1.99.1, Tauri 2.12.4, React 19.3.0, TypeScript 7.0, Vite 8.3.5, libSQL 0.9.30, rusqlite 0.40.2, Node 24 LTS, pnpm 12.15, NDK 27.2.
- Enforced strict TypeScript configuration with `noUncheckedIndexedAccess`, `noUnusedLocals`, and `noUnusedParameters`.
- Added automated `prebuild` hook (`pnpm types:gen`) before frontend compilation.

### Fixed
- Fixed `compute_xp_gain` signature to support optional multipliers (`Option<f32>` / `number | null`).
- Fixed `compute_dday_remaining` to fail strictly with `Result<DDayStatus, String>` on invalid dates.
- Cleaned unused code in `.github/scripts/audit-apk.py`.
- Corrected workflow event triggers (`push`, `pull_request`, `workflow_dispatch`) in `.github/workflows/build-apk.yml`.
