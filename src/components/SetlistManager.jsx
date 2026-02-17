import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Music,
  Trash2,
  Database,
  Check,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import "./SetlistManager.css";

export function SetlistManager({
  onClose,
  onLoadSong,
  currentBpm,
  currentBeatsPerBar,
  currentNoteValue,
}) {
  const [view, setView] = useState("setlists"); // 'setlists' or 'bank'
  const [setlists, setSetlists] = useState([]);
  const [songBank, setSongBank] = useState([]);

  // Setlist State
  const [activeSetlist, setActiveSetlist] = useState(null);
  const [newSetName, setNewSetName] = useState("");

  // Song Bank Import State
  const [showBankImport, setShowBankImport] = useState(false);
  const [selectedBankSongs, setSelectedBankSongs] = useState([]);

  // New Song Form (for both Bank and Setlist)
  const [songTitle, setSongTitle] = useState("");
  const [songBpm, setSongBpm] = useState(currentBpm);
  const [songBeats, setSongBeats] = useState(currentBeatsPerBar || 4);
  const [songNote, setSongNote] = useState(currentNoteValue || 4);

  const loadData = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const [sets, bank] = await Promise.all([
        window.electronAPI.setlist.list(),
        window.electronAPI.songbank.load(),
      ]);
      setSetlists(sets);
      setSongBank(bank || []);
    } catch (e) {
      console.error("Failed to load data:", e);
    }
  }, []);

  const updateSetlistSongs = useCallback(
    async (songs) => {
      const updatedSet = { ...activeSetlist, songs };
      setActiveSetlist(updatedSet);
      if (window.electronAPI) {
        await window.electronAPI.setlist.save(activeSetlist.name, updatedSet);
      }
    },
    [activeSetlist],
  );

  useEffect(() => {
    const init = async () => {
      await loadData();
    };
    init();
  }, [loadData]);

  // --- Bank Operations ---
  const handleAddToBank = useCallback(async () => {
    if (!songTitle) return;
    const newSong = {
      id: Date.now(),
      title: songTitle,
      bpm: songBpm,
      beatsPerBar: songBeats,
      noteValue: songNote,
    };
    const newBank = [...songBank, newSong];
    setSongBank(newBank);
    if (window.electronAPI) {
      await window.electronAPI.songbank.save(newBank);
    }
    setSongTitle("");
  }, [songTitle, songBpm, songBeats, songNote, songBank]);

  const handleDeleteFromBank = useCallback(
    async (id) => {
      if (!confirm("Delete song from bank?")) return;
      const newBank = songBank.filter((s) => s.id !== id);
      setSongBank(newBank);
      if (window.electronAPI) {
        await window.electronAPI.songbank.save(newBank);
      }
    },
    [songBank],
  );

  // --- Setlist Operations ---
  const handleCreateSetlist = useCallback(async () => {
    if (!newSetName) return;
    if (window.electronAPI) {
      const newSet = { name: newSetName, songs: [] };
      await window.electronAPI.setlist.save(newSetName, newSet);
      setNewSetName("");
      loadData();
      setActiveSetlist(newSet);
    }
  }, [newSetName, loadData]);

  const handleLoadSetlist = useCallback(async (name) => {
    if (window.electronAPI) {
      const data = await window.electronAPI.setlist.load(name);
      setActiveSetlist(data);
    }
  }, []);

  const handleDeleteSetlist = useCallback(
    async (name) => {
      if (!confirm(`Delete setlist "${name}"?`)) return;
      if (window.electronAPI) {
        await window.electronAPI.setlist.delete(name);
        loadData();
        if (activeSetlist && activeSetlist.name === name) {
          setActiveSetlist(null);
        }
      }
    },
    [activeSetlist, loadData],
  );

  const handleAddSongToSet = useCallback(async () => {
    if (!activeSetlist || !songTitle) return;
    const newSong = {
      id: Date.now(),
      title: songTitle,
      bpm: songBpm,
      beatsPerBar: songBeats,
      noteValue: songNote,
    };
    await updateSetlistSongs([...(activeSetlist.songs || []), newSong]);
    setSongTitle("");
  }, [
    activeSetlist,
    songTitle,
    songBpm,
    songBeats,
    songNote,
    updateSetlistSongs,
  ]);

  const handleRemoveSongFromSet = useCallback(
    async (index) => {
      if (!activeSetlist) return;
      const newSongs = [...activeSetlist.songs];
      newSongs.splice(index, 1);
      await updateSetlistSongs(newSongs);
    },
    [activeSetlist, updateSetlistSongs],
  );

  const moveSong = useCallback(
    async (index, direction) => {
      if (!activeSetlist) return;
      const newSongs = [...activeSetlist.songs];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= newSongs.length) return;
      // Swap
      [newSongs[index], newSongs[targetIndex]] = [
        newSongs[targetIndex],
        newSongs[index],
      ];
      await updateSetlistSongs(newSongs);
    },
    [activeSetlist, updateSetlistSongs],
  );



  // --- Import from Bank to Setlist ---
  const toggleSelectBankSong = (song) => {
    if (selectedBankSongs.find((s) => s.id === song.id)) {
      setSelectedBankSongs(selectedBankSongs.filter((s) => s.id !== song.id));
    } else {
      setSelectedBankSongs([...selectedBankSongs, song]);
    }
  };

  const importSelectedSongs = useCallback(async () => {
    if (!activeSetlist) return;
    const songsToAdd = selectedBankSongs.map((s) => ({
      ...s,
      id: Date.now() + Math.random(),
    }));
    await updateSetlistSongs([...(activeSetlist.songs || []), ...songsToAdd]);
    setShowBankImport(false);
    setSelectedBankSongs([]);
  }, [activeSetlist, selectedBankSongs, updateSetlistSongs]);

  // --- Render Helpers ---
  const renderSongForm = (onSubmit, btnLabel) => (
    <div className="add-song-form">
      <input
        type="text"
        placeholder="Song Title"
        value={songTitle}
        onChange={(e) => setSongTitle(e.target.value)}
        className="song-title-input"
      />
      <div className="song-params">
        <input
          type="number"
          value={songBpm}
          onChange={(e) => setSongBpm(Number(e.target.value))}
          className="small-input"
          title="BPM"
        />
        <div className="ts-group">
          <input
            type="number"
            value={songBeats}
            onChange={(e) => setSongBeats(Number(e.target.value))}
            className="small-input"
          />
          <span>/</span>
          <select
            value={songNote}
            onChange={(e) => setSongNote(Number(e.target.value))}
          >
            <option value="4">4</option>
            <option value="8">8</option>
            <option value="16">16</option>
          </select>
        </div>
        <button onClick={onSubmit} className="add-btn">
          {btnLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div className="setlist-overlay">
      <div className="setlist-modal">
        <header>
          <div className="tabs">
            <button
              className={`tab-btn ${view === "setlists" ? "active" : ""}`}
              onClick={() => setView("setlists")}
            >
              Setlists
            </button>
            <button
              className={`tab-btn ${view === "bank" ? "active" : ""}`}
              onClick={() => setView("bank")}
            >
              Song Bank
            </button>
          </div>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="setlist-content">
          {view === "bank" ? (
            <div className="bank-view">
              {renderSongForm(handleAddToBank, "Add to Bank")}
              <ul className="song-list">
                {songBank.map((song) => (
                  <li key={song.id} className="bank-item">
                    <div className="song-info">
                      <span className="song-title">{song.title}</span>
                      <span className="song-meta">
                        {song.bpm} BPM - {song.beatsPerBar}/{song.noteValue}
                      </span>
                    </div>
                    <button
                      className="icon-btn delete"
                      onClick={() => handleDeleteFromBank(song.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
                {songBank.length === 0 && (
                  <li className="empty">Bank is empty</li>
                )}
              </ul>
            </div>
          ) : (
            // Setlists View
            <>
              {!activeSetlist ? (
                <>
                  <div className="new-set-form">
                    <input
                      type="text"
                      placeholder="New Setlist Name"
                      value={newSetName}
                      onChange={(e) => setNewSetName(e.target.value)}
                    />
                    <button onClick={handleCreateSetlist}>
                      <Plus size={20} />
                    </button>
                  </div>

                  <ul className="setlist-list">
                    {setlists.map((name) => (
                      <li key={name} className="setlist-item">
                        <div
                          className="setlist-name"
                          onClick={() => handleLoadSetlist(name)}
                        >
                          <Music size={16} />
                          <span>{name}</span>
                        </div>
                        <button
                          className="icon-btn delete"
                          onClick={() => handleDeleteSetlist(name)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                    {setlists.length === 0 && (
                      <li className="empty">No setlists found</li>
                    )}
                  </ul>
                </>
              ) : (
                // Active Setlist View
                <div className="song-view">
                  <div className="active-set-header">
                    <button
                      className="back-btn"
                      onClick={() => setActiveSetlist(null)}
                    >
                      Back
                    </button>
                    <h3>{activeSetlist.name}</h3>
                  </div>

                  <div className="set-actions">
                    <button
                      className="action-btn play-set"
                      onClick={() => {
                        if (
                          activeSetlist.songs &&
                          activeSetlist.songs.length > 0
                        ) {
                          onLoadSong(activeSetlist, 0);
                          onClose();
                        }
                      }}
                      disabled={
                        !activeSetlist.songs || activeSetlist.songs.length === 0
                      }
                    >
                      ▶ Play Setlist
                    </button>
                    <button
                      className="action-btn"
                      onClick={() => setShowBankImport(true)}
                    >
                      <Database size={16} /> Add from Bank
                    </button>
                  </div>

                  {/* Direct Add Form */}
                  {renderSongForm(handleAddSongToSet, "Add Direct")}

                  {/* Song List */}
                  <ul className="song-list">
                    {activeSetlist.songs &&
                      activeSetlist.songs.map((song, idx) => (
                        <li key={song.id || idx}>
                          <div
                            className="song-info"
                            onClick={() => {
                              onLoadSong(activeSetlist, idx);
                              onClose();
                            }}
                          >
                            <span className="song-title">{song.title}</span>
                            <span className="song-meta">
                              {song.bpm} BPM - {song.beatsPerBar}/
                              {song.noteValue}
                            </span>
                          </div>
                          <div className="song-actions">
                            <button
                              className="icon-btn move"
                              onClick={() => moveSong(idx, -1)}
                              disabled={idx === 0}
                              title="Move Up"
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              className="icon-btn move"
                              onClick={() => moveSong(idx, 1)}
                              disabled={idx === activeSetlist.songs.length - 1}
                              title="Move Down"
                            >
                              <ChevronDown size={16} />
                            </button>
                            <button
                              className="icon-btn delete"
                              onClick={() => handleRemoveSongFromSet(idx)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </li>
                      ))}
                    {(!activeSetlist.songs ||
                      activeSetlist.songs.length === 0) && (
                      <li className="empty">No songs yet</li>
                    )}
                  </ul>

                  {/* Bank Import Modal (Nested) */}
                  {showBankImport && (
                    <div className="modal-overlay-nested">
                      <div className="nested-modal">
                        <h3>Select Songs from Bank</h3>
                        <ul className="bank-select-list">
                          {songBank.map((song) => (
                            <li
                              key={song.id}
                              onClick={() => toggleSelectBankSong(song)}
                              className={
                                selectedBankSongs.find((s) => s.id === song.id)
                                  ? "selected"
                                  : ""
                              }
                            >
                              <span>
                                {song.title} ({song.bpm})
                              </span>
                              {selectedBankSongs.find(
                                (s) => s.id === song.id,
                              ) && <Check size={16} />}
                            </li>
                          ))}
                        </ul>
                        <div className="nested-actions">
                          <button onClick={() => setShowBankImport(false)}>
                            Cancel
                          </button>
                          <button
                            className="primary"
                            onClick={importSelectedSongs}
                          >
                            Import {selectedBankSongs.length}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
