import { useState, useEffect } from "react";
import { X, Upload } from "lucide-react";
import "./SettingsModal.css";

export function SettingsModal({ onClose, onLoadBeat, onLoadAccent }) {
  const [accentFile, setAccentFile] = useState(null);
  const [beatFile, setBeatFile] = useState(null);

  // Load saved sound names on mount
  useEffect(() => {
    const loadSavedSettings = async () => {
      if (!window.electronAPI) return;
      try {
        const settings = await window.electronAPI.settings.load();
        if (settings.accentSoundPath) {
          setAccentFile(settings.accentSoundName || "Custom");
          // Auto-reload the sound
          const result = await window.electronAPI.loadSoundByPath(
            settings.accentSoundPath,
          );
          if (result && result.buffer) {
            await onLoadAccent(result.buffer);
          }
        }
        if (settings.beatSoundPath) {
          setBeatFile(settings.beatSoundName || "Custom");
          const result = await window.electronAPI.loadSoundByPath(
            settings.beatSoundPath,
          );
          if (result && result.buffer) {
            await onLoadBeat(result.buffer);
          }
        }
      } catch (e) {
        console.error("Failed to load saved sounds:", e);
      }
    };
    loadSavedSettings();
  }, []);

  const handleImport = async (type) => {
    if (!window.electronAPI) {
      alert("Custom sounds are only available in the desktop app.");
      return;
    }
    try {
      const result = await window.electronAPI.selectAudioFile();
      if (result && result.buffer) {
        // Load the sound into the engine
        if (type === "accent") {
          await onLoadAccent(result.buffer);
          setAccentFile(result.name);
        } else {
          await onLoadBeat(result.buffer);
          setBeatFile(result.name);
        }

        // Persist the file path so it survives restart
        const currentSettings = await window.electronAPI.settings.load();
        if (type === "accent") {
          currentSettings.accentSoundPath = result.filePath;
          currentSettings.accentSoundName = result.name;
        } else {
          currentSettings.beatSoundPath = result.filePath;
          currentSettings.beatSoundName = result.name;
        }
        await window.electronAPI.settings.save(currentSettings);
      }
    } catch (error) {
      console.error("Failed to import sound:", error);
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <header>
          <h2>Sound Settings</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </header>

        <div className="settings-content">
          <div className="setting-group">
            <label>Accent Sound (Downbeat)</label>
            <button
              className="import-btn"
              onClick={() => handleImport("accent")}
            >
              <Upload size={16} /> {accentFile ? accentFile : "Load File"}
            </button>
          </div>

          <div className="setting-group">
            <label>Beat Sound</label>
            <button className="import-btn" onClick={() => handleImport("beat")}>
              <Upload size={16} /> {beatFile ? beatFile : "Load File"}
            </button>
          </div>

          <p className="hint">Supports .wav, .mp3, .ogg</p>
        </div>
      </div>
    </div>
  );
}
