class MetronomeEngine {
  constructor() {
    this.audioContext = null;
    this.isPlaying = false;
    this.bpm = 120;
    this.currentNote = 0;
    this.nextNoteTime = 0.0;
    this.timerID = null;
    this.lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
    this.scheduleAheadTime = 0.1; // How far ahead to schedule audio (in seconds)

    // Default click oscillator
    this.clickFrequency = 1000;
    this.beatBuffer = null;
    this.accentBuffer = null;
    this.beatsPerBar = 4;
    this.noteValue = 4; // denominator: 4=quarter, 8=eighth, 16=sixteenth
    this.accentPattern = [3, 1, 1, 1]; // 0=mute, 1=weak, 2=medium, 3=strong
    this.onBeat = null; // callback(beatNumber, level)
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
    }
  }

  async decodeBuffer(rawBuffer) {
    this.init();
    try {
      // Electron IPC serializes Node.js Buffers as plain objects.
      // We must convert to a real ArrayBuffer for decodeAudioData.
      let arrayBuffer;
      if (rawBuffer instanceof ArrayBuffer) {
        arrayBuffer = rawBuffer;
      } else if (rawBuffer && rawBuffer.buffer instanceof ArrayBuffer) {
        // Uint8Array or similar TypedArray
        arrayBuffer = rawBuffer.buffer.slice(
          rawBuffer.byteOffset,
          rawBuffer.byteOffset + rawBuffer.byteLength,
        );
      } else {
        // Electron IPC serialized buffer (object with numeric keys + type: 'Buffer' + data array)
        const bytes = new Uint8Array(
          rawBuffer.data || Object.values(rawBuffer),
        );
        arrayBuffer = bytes.buffer;
      }
      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.error("Error decoding audio data", e);
      return null;
    }
  }

  async loadBeatSound(buffer) {
    this.beatBuffer = await this.decodeBuffer(buffer);
    return !!this.beatBuffer;
  }

  async loadAccentSound(buffer) {
    this.accentBuffer = await this.decodeBuffer(buffer);
    return !!this.accentBuffer;
  }

  nextNote() {
    // Scale by note value: /4 = normal, /8 = 2x speed, /16 = 4x speed
    const secondsPerBeat = (60.0 / this.bpm) * (4 / this.noteValue);
    this.nextNoteTime += secondsPerBeat;
    this.currentNote++;
    if (this.currentNote >= this.beatsPerBar) {
      this.currentNote = 0;
    }
  }

  scheduleNote(beatNumber, time) {
    const level = this.accentPattern[beatNumber] ?? 1;

    // Muted beat — no sound
    if (level === 0) {
      if (this.onBeat) {
        const delay = Math.max(
          0,
          (time - this.audioContext.currentTime) * 1000,
        );
        setTimeout(() => {
          if (this.onBeat) this.onBeat(beatNumber, level);
        }, delay);
      }
      return;
    }

    const isAccent = level === 3;
    const volumeMap = { 1: 0.3, 2: 0.6, 3: 1.0 };
    const volume = volumeMap[level] || 1.0;

    // Gain node for volume control
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(this.audioContext.destination);

    const bufferToPlay = isAccent
      ? this.accentBuffer || this.beatBuffer
      : this.beatBuffer;

    if (bufferToPlay) {
      const source = this.audioContext.createBufferSource();
      source.buffer = bufferToPlay;
      source.connect(gainNode);

      if (isAccent && !this.accentBuffer && this.beatBuffer) {
        source.playbackRate.value = 1.5;
      } else {
        source.playbackRate.value = 1.0;
      }

      source.start(time);
    } else {
      const osc = this.audioContext.createOscillator();
      const envelope = this.audioContext.createGain();

      osc.frequency.value = isAccent ? 1200 : 800;

      envelope.gain.value = 1;
      envelope.gain.exponentialRampToValueAtTime(1, time + 0.001);
      envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

      osc.connect(envelope);
      envelope.connect(gainNode);

      osc.start(time);
      osc.stop(time + 0.03);
    }

    // Fire visual callback at the exact moment the beat plays
    if (this.onBeat) {
      const delay = Math.max(0, (time - this.audioContext.currentTime) * 1000);
      setTimeout(() => {
        if (this.onBeat) this.onBeat(beatNumber, level);
      }, delay);
    }
  }

  scheduler() {
    // while there are notes that will need to play before the next interval,
    // schedule them and advance the pointer.
    while (
      this.nextNoteTime <
      this.audioContext.currentTime + this.scheduleAheadTime
    ) {
      this.scheduleNote(this.currentNote, this.nextNoteTime);
      this.nextNote();
    }

    if (this.isPlaying) {
      this.timerID = window.setTimeout(
        this.scheduler.bind(this),
        this.lookahead,
      );
    }
  }

  start() {
    if (this.isPlaying) return;

    this.init();
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    this.isPlaying = true;
    this.currentNote = 0;
    this.nextNoteTime = this.audioContext.currentTime + 0.05; // Start slightly in future
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerID) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
  }

  setBpm(bpm) {
    this.bpm = bpm;
  }

  setTimeSignature(numerator) {
    this.beatsPerBar = numerator;
    if (this.currentNote >= numerator) {
      this.currentNote = 0;
    }
  }

  setNoteValue(noteValue) {
    this.noteValue = noteValue;
  }

  setOnBeat(callback) {
    this.onBeat = callback;
  }

  setAccentPattern(pattern) {
    this.accentPattern = pattern;
  }
}

export default new MetronomeEngine();
