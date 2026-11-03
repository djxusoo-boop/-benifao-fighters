// Procedural arcade audio: punchy hit effects and a hardcore / bakalao style
// soundtrack generated live with the Web Audio API (no audio files needed).

export type MusicTheme = "fight" | "boss" | "victory" | "adventure" | "coop" | "orbs";
export type HitKind = "punch" | "kick" | "special" | "super" | "block" | "perfect";

type Pattern = {
  bpm: number;
  root: number;
  bass: number[];   // semitone offsets per 16th (null-ish = -99 rest)
  lead: number[];   // semitone offsets per 16th, -99 = rest
  kick: number[];   // 1 = hit per 16th
  hat: number[];
  clap: number[];
};

const R = -99;
const PATTERNS: Record<MusicTheme, Pattern> = {
  fight: {
    bpm: 168, root: 45,
    kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,1],
    hat:  [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,1],
    clap: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    bass: [R,R,0,R, R,R,0,R, R,R,0,R, R,R,3,R],
    lead: [12,R,15,R, 19,R,15,12, R,R,10,R, 12,R,R,R, 12,R,15,R, 19,R,22,R, 19,R,15,R, 17,R,15,R],
  },
  boss: {
    bpm: 182, root: 40,
    kick: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1],
    hat:  [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,1,1],
    clap: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,0],
    bass: [R,0,R,0, R,1,R,0, R,0,R,0, R,3,R,1],
    lead: [0,R,1,R, 0,R,R,7, 6,R,R,R, 3,R,1,R],
  },
  victory: {
    bpm: 150, root: 48,
    kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    hat:  [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    clap: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    bass: [R,R,0,R, R,R,0,R, R,R,5,R, R,R,7,R],
    lead: [12,R,16,R, 19,R,24,R, 19,R,16,R, 17,R,19,R, 21,R,19,R, 17,R,16,R, 14,R,12,R, 14,R,R,R],
  },
  adventure: {
    bpm: 140, root: 47,
    kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    hat:  [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    clap: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    bass: [0,R,0,R, 7,R,0,R, 5,R,5,R, 3,R,5,R],
    lead: [12,R,R,14, R,15,R,R, 17,R,15,R, 14,R,12,R],
  },
  coop: {
    bpm: 150, root: 43,
    kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,1,0],
    hat:  [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,1,1,0],
    clap: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    bass: [R,R,0,R, R,R,0,R, R,R,7,R, R,R,5,R],
    lead: [7,R,12,R, 14,R,12,R, 7,R,10,R, 12,R,R,R],
  },
  orbs: {
    bpm: 160, root: 50,
    kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    hat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1],
    clap: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    bass: [R,R,0,R, R,R,0,R, R,R,0,R, R,R,-2,R],
    lead: [12,15,19,24, 19,15,12,15, 10,14,17,22, 17,14,10,14],
  },
};

const midi = (note: number) => 440 * Math.pow(2, (note - 69) / 12);

export class ArcadeAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private distortion: WaveShaperNode | null = null;
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private theme: MusicTheme | null = null;
  private step = 0;
  private nextNoteTime = 0;
  private musicStart = 0;

  ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.context) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        const context = new Ctor();
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -14;
        compressor.ratio.value = 5;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.18;
        compressor.connect(context.destination);
        this.master = context.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(compressor);
        this.musicBus = context.createGain();
        this.musicBus.gain.value = 0.34;
        this.musicBus.connect(this.master);
        this.sfxBus = context.createGain();
        this.sfxBus.gain.value = 0.8;
        this.sfxBus.connect(this.master);
        const length = context.sampleRate;
        this.noise = context.createBuffer(1, length, context.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
        this.distortion = context.createWaveShaper();
        const curve = new Float32Array(1024);
        for (let i = 0; i < curve.length; i += 1) {
          const x = (i / (curve.length - 1)) * 2 - 1;
          curve[i] = Math.tanh(x * 6);
        }
        this.distortion.curve = curve;
        this.distortion.connect(this.musicBus);
        this.context = context;
      }
      if (this.context.state === "suspended") void this.context.resume();
      return this.context;
    } catch {
      return null;
    }
  }

  get audioContext() { return this.context; }

  private noiseBurst(time: number, duration: number, gainValue: number, filterType: BiquadFilterType, frequency: number, destination: AudioNode, q = 0.8) {
    const context = this.context;
    if (!context || !this.noise) return;
    const source = context.createBufferSource();
    source.buffer = this.noise;
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = context.createGain();
    gain.gain.setValueAtTime(gainValue, time);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + duration);
    source.connect(filter); filter.connect(gain); gain.connect(destination);
    source.start(time, Math.random() * 0.5);
    source.stop(time + duration + 0.02);
  }

  private tone(time: number, frequency: number, endFrequency: number, duration: number, gainValue: number, type: OscillatorType, destination: AudioNode) {
    const context = this.context;
    if (!context) return;
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), time + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(gainValue, time);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + duration);
    oscillator.connect(gain); gain.connect(destination);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  }

  /** Air whoosh when an attack starts. */
  swing(strength: "light" | "heavy" | "special") {
    const context = this.ensure();
    if (!context || !this.sfxBus) return;
    const t = context.currentTime;
    const duration = strength === "light" ? 0.09 : strength === "heavy" ? 0.14 : 0.22;
    const source = context.createBufferSource();
    source.buffer = this.noise;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(strength === "light" ? 900 : 600, t);
    filter.frequency.exponentialRampToValueAtTime(strength === "special" ? 4200 : 2600, t + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0008, t);
    gain.gain.exponentialRampToValueAtTime(strength === "light" ? 0.18 : 0.26, t + duration * 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.sfxBus);
    source.start(t);
    source.stop(t + duration + 0.02);
    if (strength === "special") this.tone(t, 220, 880, 0.2, 0.05, "sawtooth", this.sfxBus);
  }

  /** Body impact: low thump + crunchy noise. */
  hit(kind: HitKind) {
    const context = this.ensure();
    if (!context || !this.sfxBus) return;
    const t = context.currentTime;
    const bus = this.sfxBus;
    if (kind === "block") {
      this.tone(t, 1250, 900, 0.09, 0.08, "square", bus);
      this.tone(t, 1870, 1500, 0.12, 0.05, "triangle", bus);
      this.noiseBurst(t, 0.07, 0.25, "highpass", 3000, bus);
      return;
    }
    if (kind === "perfect") {
      [1320, 1760, 2640].forEach((f, i) => this.tone(t + i * 0.045, f, f, 0.16, 0.06, "triangle", bus));
      this.noiseBurst(t, 0.1, 0.18, "highpass", 5000, bus);
      return;
    }
    const heavy = kind !== "punch";
    const low = kind === "super" ? 70 : kind === "special" ? 90 : kind === "kick" ? 110 : 140;
    this.tone(t, low * 2.2, low * 0.55, heavy ? 0.22 : 0.13, kind === "super" ? 0.7 : heavy ? 0.55 : 0.42, "sine", bus);
    this.noiseBurst(t, heavy ? 0.16 : 0.09, kind === "super" ? 0.9 : heavy ? 0.6 : 0.45, "lowpass", heavy ? 2200 : 3200, bus);
    this.noiseBurst(t, 0.04, 0.3, "highpass", 4500, bus);
    if (kind === "super") {
      this.tone(t, 55, 30, 0.6, 0.5, "sawtooth", bus);
      this.noiseBurst(t + 0.05, 0.7, 0.35, "lowpass", 900, bus);
    }
  }

  /** Big cinematic riser for the SUPER move. */
  superRiser() {
    const context = this.ensure();
    if (!context || !this.sfxBus) return;
    const t = context.currentTime;
    this.tone(t, 110, 1760, 0.55, 0.12, "sawtooth", this.sfxBus);
    this.tone(t, 165, 2640, 0.55, 0.06, "square", this.sfxBus);
    const source = context.createBufferSource();
    source.buffer = this.noise;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(8000, t + 0.55);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.02, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.62);
    source.connect(filter); filter.connect(gain); gain.connect(this.sfxBus);
    source.start(t); source.stop(t + 0.65);
  }

  /** Short arcade jingle: ascending for good things, descending for bad. */
  jingle(kind: "round" | "fight" | "ko" | "win" | "lose" | "perfect" | "meter") {
    const context = this.ensure();
    if (!context || !this.sfxBus) return;
    const t = context.currentTime;
    const seq: Record<typeof kind, [number[], number, OscillatorType]> = {
      round: [[57, 64], 0.11, "square"],
      fight: [[64, 69, 76], 0.08, "sawtooth"],
      ko: [[45, 40, 33], 0.16, "sawtooth"],
      win: [[60, 64, 67, 72, 76, 79, 84], 0.075, "square"],
      lose: [[57, 53, 50, 45], 0.15, "triangle"],
      perfect: [[72, 76, 79, 84, 88, 91], 0.06, "triangle"],
      meter: [[76, 83, 88], 0.05, "square"],
    };
    const [notes, gap, type] = seq[kind];
    notes.forEach((note, index) => this.tone(t + index * gap, midi(note), midi(note), gap * 1.8, 0.07, type, this.sfxBus!));
    if (kind === "ko") this.noiseBurst(t, 0.8, 0.4, "lowpass", 700, this.sfxBus);
  }

  /** Simple tone kept for UI blips. */
  blip(frequency: number, duration = 0.07, type: OscillatorType = "square", volume = 0.05) {
    const context = this.ensure();
    if (!context || !this.sfxBus) return;
    this.tone(context.currentTime, frequency, frequency, duration, volume, type, this.sfxBus);
  }

  startMusic(theme: MusicTheme) {
    if (this.theme === theme && this.schedulerTimer) return;
    this.stopMusic();
    const context = this.ensure();
    if (!context) return;
    this.theme = theme;
    this.step = 0;
    this.nextNoteTime = context.currentTime + 0.06;
    this.musicStart = this.nextNoteTime;
    this.schedulerTimer = setInterval(() => this.schedule(), 25);
  }

  /** True when "now" lands on a beat of the music (or of a 168 BPM clock when the music is off). */
  isOnBeat() {
    const bpm = this.theme ? PATTERNS[this.theme].bpm : 168;
    const beat = 60 / bpm;
    const now = this.context && this.theme ? this.context.currentTime - this.musicStart : performance.now() / 1000;
    const phase = ((now % beat) + beat) % beat / beat;
    return phase < 0.2 || phase > 0.86;
  }

  stopMusic() {
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
    this.schedulerTimer = null;
    this.theme = null;
  }

  private schedule() {
    const context = this.context;
    if (!context || !this.theme || !this.musicBus || !this.distortion) return;
    const pattern = PATTERNS[this.theme];
    const sixteenth = 60 / pattern.bpm / 4;
    while (this.nextNoteTime < context.currentTime + 0.12) {
      this.playStep(pattern, this.step, this.nextNoteTime, sixteenth);
      this.nextNoteTime += sixteenth;
      this.step += 1;
    }
  }

  private playStep(pattern: Pattern, step: number, time: number, sixteenth: number) {
    const context = this.context!;
    const bus = this.musicBus!;
    const i = step % 16;
    const bar = Math.floor(step / 16);
    // Every 8th bar drops the kick for a breakdown feel.
    const breakdown = bar % 8 === 7;
    if (pattern.kick[i] && !breakdown) {
      // Distorted hardcore kick: pitch-dropping sine into the waveshaper.
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(190, time);
      oscillator.frequency.exponentialRampToValueAtTime(48, time + 0.09);
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.55, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.24);
      oscillator.connect(gain); gain.connect(this.distortion!);
      oscillator.start(time); oscillator.stop(time + 0.26);
    }
    if (pattern.hat[i]) this.noiseBurst(time, 0.045, 0.16, "highpass", 7500, bus);
    if (pattern.clap[i] && !breakdown) this.noiseBurst(time, 0.12, 0.22, "bandpass", 1600, bus, 1.2);
    const bassNote = pattern.bass[i];
    if (bassNote !== R && !breakdown) {
      const oscillator = context.createOscillator();
      oscillator.type = "sawtooth";
      oscillator.frequency.value = midi(pattern.root + bassNote);
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.Q.value = 8;
      filter.frequency.setValueAtTime(1800, time);
      filter.frequency.exponentialRampToValueAtTime(220, time + sixteenth * 1.6);
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.13, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + sixteenth * 1.8);
      oscillator.connect(filter); filter.connect(gain); gain.connect(bus);
      oscillator.start(time); oscillator.stop(time + sixteenth * 2);
    }
    const leadNote = pattern.lead[step % pattern.lead.length];
    // The lead enters after the first 4 bars, like a real track building up.
    if (leadNote !== R && bar >= 4) {
      [0, 0.09].forEach((detune, voice) => {
        const oscillator = context.createOscillator();
        oscillator.type = voice ? "square" : "sawtooth";
        oscillator.frequency.value = midi(pattern.root + 12 + leadNote) * (1 + detune / 100);
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.028, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + sixteenth * 1.7);
        oscillator.connect(gain); gain.connect(bus);
        oscillator.start(time); oscillator.stop(time + sixteenth * 1.8);
      });
    }
  }

  close() {
    this.stopMusic();
    if (this.context) void this.context.close();
    this.context = null;
  }
}
