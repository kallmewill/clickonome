import { useState, useEffect, useCallback, useRef } from "react";
import MetronomeEngine from "../audio/MetronomeEngine";

export function useMetronome() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [beatsPerBar, setBeatsPerBarState] = useState(4);
  const [noteValue, setNoteValueState] = useState(4);
  const [currentBeat, setCurrentBeat] = useState(-1);
  // 0=mute, 1=weak, 2=medium, 3=strong
  const [accentPattern, setAccentPatternState] = useState([3, 1, 1, 1]);
  const tapTimesRef = useRef([]);

  useEffect(() => {
    MetronomeEngine.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    MetronomeEngine.setTimeSignature(beatsPerBar);
  }, [beatsPerBar]);

  useEffect(() => {
    MetronomeEngine.setNoteValue(noteValue);
  }, [noteValue]);

  useEffect(() => {
    MetronomeEngine.setAccentPattern(accentPattern);
  }, [accentPattern]);

  // Register beat callback for visualizer
  useEffect(() => {
    MetronomeEngine.setOnBeat((beatNumber) => {
      setCurrentBeat(beatNumber);
    });
    return () => MetronomeEngine.setOnBeat(null);
  }, []);

  // When beatsPerBar changes, rebuild the accent pattern
  const setBeatsPerBar = useCallback((newBeats) => {
    setBeatsPerBarState(newBeats);
    setAccentPatternState((prev) => {
      const newPattern = Array.from({ length: newBeats }, (_, i) =>
        i < prev.length ? prev[i] : 1,
      );
      return newPattern;
    });
  }, []);

  // Cycle through: 3 (strong) → 2 (medium) → 1 (weak) → 0 (mute) → 3 (strong)
  const cycleAccent = useCallback((index) => {
    setAccentPatternState((prev) => {
      const newPattern = [...prev];
      const current = newPattern[index];
      newPattern[index] = current === 0 ? 3 : current - 1;
      return newPattern;
    });
  }, []);

  const start = () => {
    MetronomeEngine.start();
    setIsPlaying(true);
  };

  const stop = () => {
    MetronomeEngine.stop();
    setIsPlaying(false);
    setCurrentBeat(-1);
  };

  const toggle = () => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  };

  const handleBpmChange = (newBpm) => {
    setBpm(newBpm);
  };

  const loadBeatSound = async (buffer) => {
    return await MetronomeEngine.loadBeatSound(buffer);
  };

  const loadAccentSound = async (buffer) => {
    return await MetronomeEngine.loadAccentSound(buffer);
  };

  const tapTempo = useCallback(() => {
    const now = performance.now();
    const taps = tapTimesRef.current;

    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      tapTimesRef.current = [];
    }

    tapTimesRef.current.push(now);

    if (tapTimesRef.current.length > 8) {
      tapTimesRef.current = tapTimesRef.current.slice(-8);
    }

    const times = tapTimesRef.current;
    if (times.length >= 2) {
      let totalInterval = 0;
      for (let i = 1; i < times.length; i++) {
        totalInterval += times[i] - times[i - 1];
      }
      const avgInterval = totalInterval / (times.length - 1);
      const newBpm = Math.round(60000 / avgInterval);
      setBpm(Math.max(40, Math.min(220, newBpm)));
    }
  }, []);

  return {
    isPlaying,
    bpm,
    beatsPerBar,
    noteValue,
    currentBeat,
    accentPattern,
    start,
    stop,
    toggle,
    setBpm: handleBpmChange,
    setBeatsPerBar,
    setNoteValue: setNoteValueState,
    setAccentPattern: setAccentPatternState,
    cycleAccent,
    tapTempo,
    loadBeatSound,
    loadAccentSound,
  };
}
