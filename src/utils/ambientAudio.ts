/**
 * Zero-Asset Procedural Audio Synthesizer
 * Uses Web Audio API (AudioContext, AudioBufferSource, BiquadFilter, Gain)
 * to synthesize Brown Noise, Pink Noise, Soft Rain and timer chimes
 * without loading external MP3 or WAV audio files.
 */

export type AmbientSoundType = 'none' | 'brown' | 'pink' | 'rain';
export type ChimePresetType = 'default' | 'tibetan' | 'marimba' | 'retro';

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private currentSound: AmbientSoundType = 'none';
  private currentVolume: number = 0.5;
  private bufferCache = new Map<AmbientSoundType, AudioBuffer>();

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Generates 5 seconds of looped audio buffer
  private generateNoiseBuffer(type: 'brown' | 'pink' | 'rain'): AudioBuffer {
    if (this.bufferCache.has(type)) {
      return this.bufferCache.get(type)!;
    }
    const ctx = this.initContext();
    const bufferSize = ctx.sampleRate * 5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'brown') {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else if (type === 'rain') {
      // Soft rain: pink noise base with gentle randomized droplet ripples
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.0990460;
        b1 = 0.96300 * b1 + white * 0.2965164;
        b2 = 0.57000 * b2 + white * 1.0526913;
        const pink = (b0 + b1 + b2 + white * 0.1848) * 0.08;
        const drop = Math.random() < 0.003 ? (Math.random() - 0.5) * 0.3 : 0;
        data[i] = (pink + drop) * 0.9;
      }
    }

    this.bufferCache.set(type, buffer);
    return buffer;
  }

  public getCurrentSound(): AmbientSoundType {
    return this.currentSound;
  }

  public setSound(sound: AmbientSoundType, volume = this.currentVolume) {
    this.currentSound = sound;
    this.currentVolume = Math.max(0, Math.min(1, volume));

    this.stop();

    if (sound === 'none') return;

    try {
      const ctx = this.initContext();
      const buffer = this.generateNoiseBuffer(sound);

      this.sourceNode = ctx.createBufferSource();
      this.sourceNode.buffer = buffer;
      this.sourceNode.loop = true;

      this.filterNode = ctx.createBiquadFilter();
      if (sound === 'brown') {
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.setValueAtTime(450, ctx.currentTime);
      } else if (sound === 'pink') {
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.setValueAtTime(1200, ctx.currentTime);
      } else if (sound === 'rain') {
        this.filterNode.type = 'bandpass';
        this.filterNode.frequency.setValueAtTime(1400, ctx.currentTime);
        this.filterNode.Q.setValueAtTime(0.8, ctx.currentTime);
      }

      this.gainNode = ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.currentVolume * 0.4, ctx.currentTime);

      this.sourceNode.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      this.gainNode.connect(ctx.destination);

      this.sourceNode.start();
    } catch {
      // Audio autoplay blocked until user gesture
    }
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.currentVolume * 0.4, this.ctx.currentTime);
    }
  }

  public stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // Ignore stop error
      }
      this.sourceNode = null;
    }
  }

  public playChime(preset: ChimePresetType = 'default') {
    try {
      const ctx = this.initContext();

      if (preset === 'tibetan') {
        // Resonant Tibetan Singing Bowl (sine + sub-harmonics with slow 2.5s decay)
        const fundamental = 392; // G4
        [1, 2.76, 5.4].forEach((ratio, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(fundamental * ratio, ctx.currentTime);

          const vol = 0.25 / (idx + 1);
          gain.gain.setValueAtTime(vol, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.5);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 2.5);
        });
      } else if (preset === 'marimba') {
        // Soft Wooden Marimba (fast percussive strike at C5 + E5)
        [523.25, 659.25].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);

          gain.gain.setValueAtTime(0.35, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.6);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.6);
        });
      } else if (preset === 'retro') {
        // 8-Bit Retro Chiptune Arpeggio (Square wave: C5 -> E5 -> G5 -> C6)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);

          gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.18);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.07);
          osc.stop(ctx.currentTime + i * 0.07 + 0.18);
        });
      } else {
        // Default Soft Chime (Sine chirp D5 -> A5)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch {
      // Audio context blocked
    }
  }
}

export const ambientAudio = new AmbientAudioEngine();
