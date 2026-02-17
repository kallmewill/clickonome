import { useState, useEffect } from "react";
import { useMetronome } from "./hooks/useMetronome";
import {
  Play,
  Square,
  Settings,
  List,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { SetlistManager } from "./components/SetlistManager";
import { SettingsModal } from "./components/SettingsModal";
import "./App.css";

function App() {
  const {
    isPlaying,
    bpm,
    toggle,
    setBpm,
    beatsPerBar,
    setBeatsPerBar,
    noteValue,
    setNoteValue,
    currentBeat,
    accentPattern,
    cycleAccent,
    tapTempo,
    loadBeatSound,
    loadAccentSound,
  } = useMetronome();
  const [showSetlist, setShowSetlist] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Auto-load saved sounds on app startup
  useEffect(() => {
    const loadSavedSounds = async () => {
      if (!window.electronAPI) return;
      try {
        const settings = await window.electronAPI.settings.load();
        if (settings.accentSoundPath) {
          const result = await window.electronAPI.loadSoundByPath(
            settings.accentSoundPath,
          );
          if (result && result.buffer) await loadAccentSound(result.buffer);
        }
        if (settings.beatSoundPath) {
          const result = await window.electronAPI.loadSoundByPath(
            settings.beatSoundPath,
          );
          if (result && result.buffer) await loadBeatSound(result.buffer);
        }
      } catch (e) {
        console.error("Failed to auto-load sounds:", e);
      }
    };
    loadSavedSounds();
  }, [loadAccentSound, loadBeatSound]);

  // Setlist State
  const [currentSetlist, setCurrentSetlist] = useState(null);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [songTitle, setSongTitle] = useState("");

  const playSong = (song) => {
    setBpm(song.bpm);
    setBeatsPerBar(song.beatsPerBar);
    setNoteValue(song.noteValue);
    setSongTitle(song.title);
  };

  const handleLoadSetlist = (setlist, index) => {
    setCurrentSetlist(setlist);
    setCurrentSongIndex(index);
    if (setlist.songs && setlist.songs[index]) {
      playSong(setlist.songs[index]);
    }
  };

  const handleNext = () => {
    if (!currentSetlist) return;
    const nextIndex = currentSongIndex + 1;
    if (nextIndex < currentSetlist.songs.length) {
      setCurrentSongIndex(nextIndex);
      playSong(currentSetlist.songs[nextIndex]);
    }
  };

  const handlePrev = () => {
    if (!currentSetlist) return;
    const prevIndex = currentSongIndex - 1;
    if (prevIndex >= 0) {
      setCurrentSongIndex(prevIndex);
      playSong(currentSetlist.songs[prevIndex]);
    }
  };

  const jumpToSong = (index) => {
    if (!currentSetlist || !currentSetlist.songs[index]) return;
    setCurrentSongIndex(index);
    playSong(currentSetlist.songs[index]);
  };

  return (
    <div className="container">
      <header className="titlebar">
        <div className="drag-region">
          Clickonome {currentSetlist ? `— ${currentSetlist.name}` : ""}
        </div>
        <div className="window-controls"></div>
      </header>

      <main className="main-content">
        <div className="bpm-display">
          {songTitle && <div className="current-song-title">{songTitle}</div>}
          <h1 className="bpm-text">{bpm}</h1>
          <span className="bpm-label">BPM</span>

          <div className="time-sig-controls">
            <input
              type="number"
              className="ts-input"
              value={beatsPerBar}
              onChange={(e) => setBeatsPerBar(Number(e.target.value))}
              min="1"
              max="32"
            />
            <span className="ts-divider">/</span>
            <select
              className="ts-select"
              value={noteValue}
              onChange={(e) => setNoteValue(Number(e.target.value))}
            >
              <option value="4">4</option>
              <option value="8">8</option>
              <option value="16">16</option>
            </select>
          </div>
        </div>

        <div className="visualizer">
          <div className="beat-progress-bar">
            <div
              className="beat-progress-fill"
              style={{
                width:
                  currentBeat >= 0
                    ? `${((currentBeat + 1) / beatsPerBar) * 100}%`
                    : "0%",
              }}
            />
          </div>
          <div className="beat-blocks">
            {Array.from({ length: beatsPerBar }, (_, i) => {
              const level = accentPattern[i] ?? 1;
              return (
                <div
                  key={i}
                  className={`beat-block${i === currentBeat ? " active" : ""}${level === 0 ? " muted" : ""}`}
                  onClick={() => cycleAccent(i)}
                  title={["Mute", "Weak", "Medium", "Strong"][level]}
                >
                  <span
                    className={`block-line${level >= 3 ? " filled" : ""}`}
                  />
                  <span
                    className={`block-line${level >= 2 ? " filled" : ""}`}
                  />
                  <span
                    className={`block-line${level >= 1 ? " filled" : ""}`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="controls">
          <button
            className="control-btn secondary"
            onClick={() => setShowSetlist(true)}
            title="Setlists"
          >
            <List size={22} />
          </button>

          <div className="transport-controls">
            <button
              className="control-btn nav"
              onClick={handlePrev}
              disabled={!currentSetlist || currentSongIndex <= 0}
              title="Previous Song"
            >
              <SkipBack size={20} />
            </button>

            <button
              className={`control-btn primary ${isPlaying ? "active" : ""}`}
              onClick={toggle}
            >
              {isPlaying ? (
                <Square size={28} fill="currentColor" />
              ) : (
                <Play size={28} fill="currentColor" />
              )}
            </button>

            <button
              className="control-btn nav"
              onClick={handleNext}
              disabled={
                !currentSetlist ||
                !currentSetlist.songs ||
                currentSongIndex >= currentSetlist.songs.length - 1
              }
              title="Next Song"
            >
              <SkipForward size={20} />
            </button>
          </div>

          <button
            className="control-btn secondary"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings size={22} />
          </button>
        </div>

        {/* Active Setlist Strip */}
        {currentSetlist &&
          currentSetlist.songs &&
          currentSetlist.songs.length > 0 && (
            <div className="setlist-strip">
              <div className="setlist-strip-title">{currentSetlist.name}</div>
              {currentSetlist.songs.map((song, idx) => (
                <div
                  key={song.id || idx}
                  className={`strip-song ${idx === currentSongIndex ? "active" : ""}`}
                  onClick={() => jumpToSong(idx)}
                >
                  <span>{song.title}</span>
                  <span className="strip-meta">
                    {song.bpm} · {song.beatsPerBar}/{song.noteValue}
                  </span>
                </div>
              ))}
            </div>
          )}

        <div className="slider-container">
          <input
            type="range"
            min="40"
            max="220"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="bpm-slider"
          />
        </div>

        <button className="tap-tempo-btn" onClick={tapTempo}>
          TAP TEMPO
        </button>

        {showSetlist && (
          <SetlistManager
            onClose={() => setShowSetlist(false)}
            onLoadSong={handleLoadSetlist}
            currentBpm={bpm}
            currentBeatsPerBar={beatsPerBar}
            currentNoteValue={noteValue}
          />
        )}

        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            onLoadBeat={loadBeatSound}
            onLoadAccent={loadAccentSound}
          />
        )}
      </main>
    </div>
  );
}

export default App;
