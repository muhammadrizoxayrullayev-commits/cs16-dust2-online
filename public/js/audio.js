// Counter-Strike 1.6 Procedural & Synthesized Audio Engine (Web Audio API)
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.initialized = false;
    this.volume = 0.8;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  // Gunfire Sounds
  playShoot(weaponId = 'ak47') {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    switch (weaponId) {
      case 'ak47':
        // Iconic punchy AK-47 crack
        this._synthesizeShot({
          freq: 260,
          endFreq: 45,
          duration: 0.28,
          noiseAmount: 0.8,
          decay: 0.22,
          punch: 1.2
        });
        break;

      case 'm4a1':
        // Silenced crisp M4A1 snap
        this._synthesizeShot({
          freq: 380,
          endFreq: 90,
          duration: 0.22,
          noiseAmount: 0.5,
          decay: 0.16,
          punch: 0.85
        });
        break;

      case 'awp':
        // Massive reverberating AWP sniper boom
        this._synthesizeShot({
          freq: 150,
          endFreq: 25,
          duration: 0.85,
          noiseAmount: 1.0,
          decay: 0.7,
          punch: 2.2
        });
        // Bolt cycle sound after 0.5s
        setTimeout(() => this.playReloadClick(1), 500);
        setTimeout(() => this.playReloadClick(2), 850);
        break;

      case 'deagle':
        // Desert Eagle heavy hand cannon
        this._synthesizeShot({
          freq: 220,
          endFreq: 40,
          duration: 0.32,
          noiseAmount: 0.9,
          decay: 0.28,
          punch: 1.4
        });
        break;

      case 'glock':
      case 'usp':
      default:
        // Snappy pistol
        this._synthesizeShot({
          freq: 340,
          endFreq: 70,
          duration: 0.18,
          noiseAmount: 0.6,
          decay: 0.15,
          punch: 0.9
        });
        break;
    }
  }

  _synthesizeShot(opts) {
    const now = this.ctx.currentTime;

    // Pitch oscillator for punch
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(opts.freq, now);
    osc.frequency.exponentialRampToValueAtTime(opts.endFreq, now + opts.decay);

    oscGain.gain.setValueAtTime(opts.punch, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + opts.decay);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + opts.decay);

    // White noise blast for gunpowder explosion
    const bufferSize = this.ctx.sampleRate * opts.duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter for weapon body resonance
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(1.5, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(opts.noiseAmount, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + opts.duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + opts.duration);
  }

  // Knife slash
  playKnifeSlash() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Reload sound (magazine clip, bolt pull)
  playReloadClick(stage = 1) {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(stage === 1 ? 650 : 920, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Footstep Sound
  playFootstep(material = 'sand') {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.09);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  // Hit Impact & Headshot Dink
  playHit(isHeadshot = false) {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    if (isHeadshot) {
      // Iconic helmet dink ("PING!")
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      // Body flesh thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  }

  // C4 Digital Beep
  playBombBeep() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, now);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  // C4 Explosion
  playExplosion() {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Sub-bass shockwave
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 1.8);
    oscGain.gain.setValueAtTime(1.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 1.8);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.8);

    // Roaring noise rumble
    const bufferSize = this.ctx.sampleRate * 2.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 2.2);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 2.2);
  }

  // Radio Voice Lines (Synthesized Radio Transmissions)
  playVoice(line) {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(line);
        utter.rate = 1.15;
        utter.pitch = 0.9;
        utter.volume = this.volume;
        window.speechSynthesis.speak(utter);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }
  }
}

export const soundEngine = new SoundEngine();
