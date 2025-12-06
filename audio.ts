
export const SOUNDS = {
    bgm: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3', // Keep BGM as external for now
    // The following keys are handled synthetically
    engine: 'engine',
    coin: 'coin',
    crash: 'crash',
    boost: 'boost',
    correct: 'correct',
    wrong: 'wrong',
    drift: 'drift',
    jump: 'jump',
    scrape: 'scrape'
};

class SoundManager {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    
    // Engine Nodes
    private engineOsc1: OscillatorNode | null = null;
    private engineOsc2: OscillatorNode | null = null;
    private engineGain: GainNode | null = null;
    
    private bgm: HTMLAudioElement | null = null;
    
    private isMuted: boolean = false;
    private initialized: boolean = false;

    constructor() {}

    init() {
        if (this.initialized) return;

        // Initialize Web Audio Context
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContext();
        
        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 1.0;

        // Initialize BGM
        this.bgm = new Audio(SOUNDS.bgm);
        this.bgm.loop = true;
        this.bgm.volume = 0.3;

        this.initialized = true;
    }

    resume() {
        if (!this.initialized) this.init();
        if (this.ctx?.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
        }
        if (this.bgm) {
            this.bgm.muted = this.isMuted;
        }
        return this.isMuted;
    }

    getMuteState() {
        return this.isMuted;
    }

    startMusic() {
        this.resume();
        if (this.bgm && !this.isMuted) {
            this.bgm.play().catch(e => console.warn("Music play failed:", e));
        }
    }

    stopMusic() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
        }
    }

    startEngine() {
        this.resume();
        if (!this.ctx || !this.masterGain) return;
        this.stopEngine();

        this.engineOsc1 = this.ctx.createOscillator();
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc1.frequency.value = 40; 

        this.engineOsc2 = this.ctx.createOscillator();
        this.engineOsc2.type = 'square';
        this.engineOsc2.frequency.value = 20;

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.02; // Very low volume for background hum

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300; 

        this.engineOsc1.connect(filter);
        this.engineOsc2.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.masterGain);

        this.engineOsc1.start();
        this.engineOsc2.start();
    }

    stopEngine() {
        try {
            if (this.engineOsc1) { this.engineOsc1.stop(); this.engineOsc1.disconnect(); }
            if (this.engineOsc2) { this.engineOsc2.stop(); this.engineOsc2.disconnect(); }
        } catch (e) {}
        this.engineOsc1 = null;
        this.engineOsc2 = null;
    }

    updateEnginePitch(speedRatio: number) {
        if (!this.engineOsc1 || !this.engineOsc2 || !this.ctx || !this.engineGain) return;
        const r = Math.abs(speedRatio);
        const targetFreq = 40 + (r * 100);
        this.engineOsc1.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
        this.engineOsc2.frequency.setTargetAtTime(targetFreq / 2, this.ctx.currentTime, 0.1); 
        
        // Slightly louder when fast, but still quiet
        const targetVol = 0.02 + (r * 0.04);
        this.engineGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.1);
    }

    // Fully synthesized SFX - No file loading required
    playSfx(key: string) {
        if (this.isMuted || !this.ctx || !this.masterGain) return;
        this.resume();
        
        const t = this.ctx.currentTime;

        switch (key) {
            case 'coin':
                // High pitch sine ping
                const coinOsc = this.ctx.createOscillator();
                const coinGain = this.ctx.createGain();
                coinOsc.type = 'sine';
                coinOsc.frequency.setValueAtTime(1500, t);
                coinOsc.frequency.exponentialRampToValueAtTime(2500, t + 0.1);
                
                coinGain.gain.setValueAtTime(0.4, t);
                coinGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                
                coinOsc.connect(coinGain);
                coinGain.connect(this.masterGain);
                coinOsc.start(t);
                coinOsc.stop(t + 0.2);
                break;

            case 'crash':
            case 'scrape':
                // Noise burst
                const duration = key === 'crash' ? 0.3 : 0.1;
                const bufferSize = this.ctx.sampleRate * duration;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                const noiseGain = this.ctx.createGain();
                const noiseFilter = this.ctx.createBiquadFilter();
                noiseFilter.type = key === 'crash' ? 'lowpass' : 'bandpass';
                noiseFilter.frequency.value = key === 'crash' ? 500 : 1000;
                
                noiseGain.gain.setValueAtTime(0.5, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + duration);
                
                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(this.masterGain);
                noise.start(t);
                break;

            case 'jump':
                const jumpOsc = this.ctx.createOscillator();
                const jumpGain = this.ctx.createGain();
                jumpOsc.type = 'triangle';
                jumpOsc.frequency.setValueAtTime(200, t);
                jumpOsc.frequency.linearRampToValueAtTime(600, t + 0.3);
                
                jumpGain.gain.setValueAtTime(0.3, t);
                jumpGain.gain.linearRampToValueAtTime(0, t + 0.3);
                
                jumpOsc.connect(jumpGain);
                jumpGain.connect(this.masterGain);
                jumpOsc.start(t);
                jumpOsc.stop(t + 0.3);
                break;

            case 'boost':
                const boostOsc = this.ctx.createOscillator();
                const boostGain = this.ctx.createGain();
                boostOsc.type = 'sawtooth';
                boostOsc.frequency.setValueAtTime(100, t);
                boostOsc.frequency.exponentialRampToValueAtTime(800, t + 0.5);
                
                boostGain.gain.setValueAtTime(0.3, t);
                boostGain.gain.linearRampToValueAtTime(0, t + 0.5);
                
                boostOsc.connect(boostGain);
                boostGain.connect(this.masterGain);
                boostOsc.start(t);
                boostOsc.stop(t + 0.5);
                break;

            case 'correct':
                // Major arpeggio
                [523.25, 659.25, 783.99].forEach((freq, i) => {
                    const o = this.ctx!.createOscillator();
                    const g = this.ctx!.createGain();
                    o.type = 'sine';
                    o.frequency.value = freq;
                    g.gain.setValueAtTime(0.1, t + i * 0.05);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
                    o.connect(g);
                    g.connect(this.masterGain!);
                    o.start(t + i * 0.05);
                    o.stop(t + 0.4);
                });
                break;

            case 'wrong':
                // Dissonant low buzz
                const wOsc = this.ctx.createOscillator();
                const wGain = this.ctx.createGain();
                wOsc.type = 'sawtooth';
                wOsc.frequency.setValueAtTime(100, t);
                wOsc.frequency.linearRampToValueAtTime(80, t + 0.3);
                wGain.gain.setValueAtTime(0.3, t);
                wGain.gain.linearRampToValueAtTime(0, t + 0.3);
                wOsc.connect(wGain);
                wGain.connect(this.masterGain);
                wOsc.start(t);
                wOsc.stop(t + 0.3);
                break;
                
            case 'drift':
                // Short friction noise
                const dBufSize = this.ctx.sampleRate * 0.1;
                const dBuf = this.ctx.createBuffer(1, dBufSize, this.ctx.sampleRate);
                const dData = dBuf.getChannelData(0);
                for(let i=0; i<dBufSize; i++) dData[i] = Math.random() * 2 - 1;
                const dNode = this.ctx.createBufferSource();
                dNode.buffer = dBuf;
                const dFilter = this.ctx.createBiquadFilter();
                dFilter.type = 'bandpass';
                dFilter.frequency.value = 800;
                const dGain = this.ctx.createGain();
                dGain.gain.value = 0.2;
                dNode.connect(dFilter);
                dFilter.connect(dGain);
                dGain.connect(this.masterGain);
                dNode.start(t);
                break;
        }
    }
}

export const soundManager = new SoundManager();
