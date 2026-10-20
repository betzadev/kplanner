# K-Planner

[![Tauri v2](https://img.shields.io/badge/Tauri_v2-24C8D8?style=flat-square&logo=tauri&logoColor=white)](https://v2.tauri.app/)
[![React 19](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-DEA584?style=flat-square&logo=rust&logoColor=black)](https://www.rust-lang.org/)
[![Turso / libSQL](https://img.shields.io/badge/Turso_libSQL-4FF8D2?style=flat-square&logo=sqlite&logoColor=black)](https://turso.tech/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-443e38?style=flat-square)](https://github.com/pmndrs/zustand)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)

K-Planner is a clean, colorful, and minimalist study planner designed for both desktop and mobile devices. It combines the structured Korean 10-minute study grid with a Pomodoro focus timer, automatic task forwarding, and study streaks to help you build steady daily learning habits.

The app works completely offline by writing directly to a local SQLite database on your device, and syncs automatically with the cloud through [Turso](https://turso.tech/) whenever you are connected to the internet.

---

## Notable Highlights & Techniques

- **Smooth Touch Painting**: You can tap and drag across the 10-minute grid to color your study sessions. The app calculates touched cells on the fly with [`document.elementFromPoint()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/elementFromPoint), keeping interactions instant and responsive.
- **Paint vs. Scroll Modes**: You can switch between painting cells and sliding through your schedule without accidental marks, using [`touch-action`](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) and [`Event.preventDefault()`](https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault).
- **Accurate Timer in Background**: The timer stays accurate even if you switch apps or lock your screen by listening to the [`visibilitychange`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event) event and checking actual elapsed clock time.
- **Built-in Audio Chimes**: Session alerts use the browser's native [`AudioContext`](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext) to play gentle chimes without loading external sound files.
- **Automatic System Theme**: The app automatically matches your device's light or dark appearance using [`Window.matchMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia), with a manual switch in Settings.
- **Reconnection Sync**: Whenever your phone connects to Wi-Fi or mobile data, the app detects the [`online`](https://developer.mozilla.org/en-US/docs/Web/API/Window/online_event) event and syncs your local progress with the cloud.

---

## Libraries & Tools Used

- **[libSQL (by Turso)](https://github.com/tursodatabase/libsql)**: An open-source SQLite fork running locally in Rust for zero-latency offline use, syncing changes to Turso with a single native call (`db.sync().await`).
- **[Tauri v2](https://v2.tauri.app/)**: A lightweight framework that uses Rust for the backend and your system's native webview for the frontend, keeping the app fast and small.
- **[Zustand](https://github.com/pmndrs/zustand)**: Simple and reactive state management for daily sheets, timers, subjects, and gamification rewards.
- **[Lucide React](https://lucide.dev/) & [React Icons](https://react-icons.github.io/react-icons/)**: Crisp icons for actions and stats, including the botanical `TbPlant2` emblem.
- **[Inter Font](https://fonts.google.com/specimen/Inter)**: A clean font designed for screens that keeps numbers and time labels aligned.

---

## Project Structure

```
kplanner/
├── .github/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── analytics/
│   │   ├── gamification/
│   │   ├── planner/
│   │   ├── settings/
│   │   ├── timer/
│   │   └── ui/
│   ├── hooks/
│   ├── services/
│   ├── store/
│   ├── types/
│   └── utils/
├── src-tauri/
│   ├── gen/
│   ├── icons/
│   └── src/
├── index.html
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── vite.config.ts
```

### Key Folders

- [`src/components/planner/`](./src/components/planner/): The 10-minute visual time grid, subject palette, and daily task checklist with rollover support.
- [`src/components/timer/`](./src/components/timer/): The countdown clock face, Pomodoro cycle buttons, and phase navigation (with next and previous phase controls).
- [`src/components/analytics/`](./src/components/analytics/): Interactive 24-hour column charts, subject distribution donuts, weekly trend bars, and the 12-month annual overview.
- [`src/components/gamification/`](./src/components/gamification/): Streak tracking, XP progression, and the Duolingo-style rewards modal with streak freeze protection.
- [`src/store/`](./src/store/): Central state stores for daily sheets, timers, themes, subjects, and study milestones.
- [`src/services/`](./src/services/): Bridges between the React frontend and the Rust backend, including cloud sync triggers.
- [`src-tauri/src/`](./src-tauri/src/): The Rust backend handling native commands, local storage, and the libSQL database connection.
