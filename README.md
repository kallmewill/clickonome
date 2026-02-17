# Clickonome

A modern, high-performance metronome built for musicians. Designed for live worship, band rehearsals, and practice sessions.

Built with **Electron + React + Web Audio API**.

![Version](https://img.shields.io/badge/version-1.1.0-00e5ff?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Windows-0078d4?style=flat-square)
![License](https://img.shields.io/badge/license-Private-333?style=flat-square)

---

## Features

### 🎵 Core Metronome

- **BPM Range**: 40–220 BPM with slider control
- **Tap Tempo**: Rhythmically tap to set your tempo (averages last 8 taps, auto-resets after 2s)
- **Time Signatures**: Any numerator (1–32) with `/4`, `/8`, `/16` denominators
- **Beat Accent Selector**: Clickable blocks — 4 intensity levels per beat:
  - **Strong** (███) — accent sound at full volume
  - **Medium** (██░) — beat sound at 60%
  - **Weak** (█░░) — beat sound at 30%
  - **Mute** (░░░) — silent
- **Beat Visualizer**: Progress bar + beat blocks glow cyan in real-time as each beat plays

### 🎧 Custom Sounds

- Load custom `.wav`, `.mp3`, or `.ogg` files for beat and accent clicks
- **Persistent**: Uploaded sounds are remembered across app restarts
- Falls back to oscillator-generated clicks when no custom sounds are loaded

### 📋 Setlist Manager

- Create and manage multiple setlists
- **Song Bank**: Save songs with BPM, time signature, and title for quick reuse
- **Reorderable**: Move songs up/down within a setlist
- **Quick Navigation**: Click any song in the setlist strip to jump to it
- **Play Setlist**: One-click to load and start playing through a setlist
- Previous/Next buttons for sequential song navigation

### 🖥️ Desktop App

- Native Windows installer (NSIS) with custom install directory
- Custom app icon (taskbar + title bar + installer)
- Dark, sleek UI with glassmorphism and cyan accent theme
- Compact window (400×700) optimized for side-of-screen use

---

## Tech Stack

| Layer        | Technology                                                 |
| ------------ | ---------------------------------------------------------- |
| **Runtime**  | Electron 40                                                |
| **Frontend** | React 19, Vite 7                                           |
| **Audio**    | Web Audio API (`AudioContext`, `GainNode`, `BufferSource`) |
| **Icons**    | Lucide React                                               |
| **Build**    | electron-builder (NSIS target)                             |
| **IPC**      | Electron contextBridge + ipcRenderer/ipcMain               |

---

## Project Structure

```
clickonome/
├── electron/
│   ├── main.cjs          # Electron main process (IPC, file I/O, window)
│   ├── preload.cjs       # Context bridge (exposes APIs to renderer)
│   └── icon.ico          # App icon
├── src/
│   ├── audio/
│   │   └── MetronomeEngine.js   # Core scheduling engine (Web Audio API)
│   ├── hooks/
│   │   └── useMetronome.js      # React hook wrapping the engine
│   ├── components/
│   │   ├── SetlistManager.jsx   # Setlist/song bank CRUD + UI
│   │   ├── SetlistManager.css
│   │   ├── SettingsModal.jsx    # Sound import + persistence
│   │   └── SettingsModal.css
│   ├── App.jsx           # Main UI (controls, visualizer, routing)
│   ├── App.css           # All app styling
│   ├── main.jsx          # React entry point
│   └── index.css         # Global CSS variables & resets
├── public/               # Static assets
├── package.json          # Scripts, dependencies, electron-builder config
└── vite.config.js        # Vite configuration
```

---

## Data Persistence

All user data is stored in Electron's `userData` directory (`%APPDATA%/clickonome/`):

| File              | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `settings.json`   | Custom sound file paths (beat + accent)  |
| `songbank.json`   | Saved songs with BPM/time signature      |
| `setlists/*.json` | Individual setlist files with song lists |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm

### Development

```bash
# Install dependencies
npm install

# Start dev server (React + Electron)
npm run dev
```

This launches Vite on `localhost:5173` and opens Electron pointing to it.

### Production Build

```bash
# Build + package installer
npm run build
```

Output: `release/Clickonome Setup 1.1.0.exe`

The installer allows users to choose the installation directory.

---

## Customization

### Changing the App Icon

1. Create a **256×256** `.ico` file
2. Replace `electron/icon.ico` (and optionally `public/icon.ico`)
3. Run `npm run build`

The icon appears in the taskbar, title bar, and installer.

### Architecture Notes

**MetronomeEngine** uses the Web Audio API's lookahead scheduling pattern:

- A `setTimeout` loop runs every 25ms
- It schedules notes 100ms ahead using `AudioContext.currentTime`
- Each beat's volume is controlled via `GainNode` based on the accent level
- Visual callbacks fire via `setTimeout` synced to the audio clock

This approach ensures **rock-solid timing** regardless of UI rendering performance.

---

## Author

**Kallmewill**
