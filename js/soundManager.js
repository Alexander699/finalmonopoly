// ============================================================
// GLOBAL ECONOMIC WARS - Sound Manager (Web Audio API)
// ============================================================

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicEnabled = true;
    this.volume = 0.5;
    this.musicVolume = 0.3;
    this.musicNode = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio not available');
    }
  }

  // Generate simple sounds using oscillators
  playTone(freq, duration, type = 'sine', vol = 1) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(this.volume * vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  playDiceRoll() {
    if (!this.enabled || !this.ctx) return;
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.playTone(200 + Math.random() * 400, 0.05, 'square', 0.3);
      }, i * 50);
    }
  }

  playMove() {
    this.playTone(440, 0.1, 'sine', 0.4);
  }

  playPurchase() {
    if (!this.ctx) return;
    this.playTone(523, 0.15, 'sine', 0.5);
    setTimeout(() => this.playTone(659, 0.15, 'sine', 0.5), 150);
    setTimeout(() => this.playTone(784, 0.3, 'sine', 0.5), 300);
  }

  playRentPaid() {
    this.playTone(330, 0.2, 'sawtooth', 0.3);
    setTimeout(() => this.playTone(262, 0.3, 'sawtooth', 0.3), 200);
  }

  playCard() {
    this.playTone(600, 0.1, 'triangle', 0.4);
    setTimeout(() => this.playTone(800, 0.15, 'triangle', 0.4), 100);
  }

  playBankrupt() {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => this.playTone(200 - i * 40, 0.3, 'sawtooth', 0.5), i * 200);
    }
  }

  playVictory() {
    const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, 0.2, 'sine', 0.5), i * 100);
    });
  }

  playClick() {
    this.playTone(800, 0.05, 'square', 0.2);
  }

  playError() {
    this.playTone(200, 0.3, 'square', 0.3);
  }

  playSanctions() {
    this.playTone(150, 0.5, 'sawtooth', 0.4);
    setTimeout(() => this.playTone(100, 0.5, 'sawtooth', 0.4), 300);
  }

  playDevelop() {
    this.playTone(440, 0.1, 'triangle', 0.4);
    setTimeout(() => this.playTone(554, 0.1, 'triangle', 0.4), 100);
    setTimeout(() => this.playTone(659, 0.2, 'triangle', 0.5), 200);
  }

  // Simple background music using oscillators
  startMusic() {
    if (!this.musicEnabled || !this.ctx || this.musicNode) return;

    const playNote = (freq, start, dur) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + start);
      gain.gain.setValueAtTime(this.musicVolume * 0.15, this.ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + start + dur);
      osc.start(this.ctx.currentTime + start);
      osc.stop(this.ctx.currentTime + start + dur);
    };

    // Ambient chord progression
    const chords = [
      [261, 329, 392],  // C major
      [293, 369, 440],  // D major
      [220, 277, 330],  // A minor
      [246, 311, 370],  // B minor
    ];

    let time = 0;
    chords.forEach(chord => {
      chord.forEach(freq => playNote(freq, time, 2.5));
      time += 2.5;
    });

    // Loop
    this.musicInterval = setInterval(() => {
      if (!this.musicEnabled) return;
      let t = 0;
      chords.forEach(chord => {
        chord.forEach(freq => playNote(freq, t, 2.5));
        t += 2.5;
      });
    }, 10000);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) this.stopMusic();
    else this.startMusic();
    return this.musicEnabled;
  }
}
