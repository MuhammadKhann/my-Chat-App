class SoundService {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.ringtoneInterval = null;
    this.dialToneInterval = null;
    this.msgTimeout = null;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.audioCtx = new AudioContext();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.connect(this.audioCtx.destination);
      this.masterGain.gain.value = 0.3;
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  playTone(freq, type, duration, vol, slideToFreq = null) {
    try {
      this.init();
      if (!this.audioCtx || this.audioCtx.state !== 'running') return;
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      if (slideToFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideToFreq, this.audioCtx.currentTime + duration);
      }

      gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      // Silence errors (likely autoplay policy block)
    }
  }

  playIncomingMessage() {
    if (this.msgTimeout) clearTimeout(this.msgTimeout);
    this.playTone(600, 'sine', 0.15, 0.4);
    this.msgTimeout = setTimeout(() => this.playTone(800, 'sine', 0.25, 0.4), 100);
  }

  playSentMessage() {
    this.playTone(300, 'sine', 0.1, 0.2, 500);
  }

  playIncomingCallRing() {
    this.stopIncomingCallRing();
    this.init();
    
    const playRing = () => {
      this.playTone(440, 'sine', 0.2, 0.5);
      setTimeout(() => this.playTone(480, 'sine', 0.2, 0.5), 200);
      setTimeout(() => this.playTone(520, 'sine', 0.4, 0.5), 400);
    };

    playRing();
    this.ringtoneInterval = setInterval(playRing, 2000);
  }

  stopIncomingCallRing() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  playOutgoingCallRing() {
    this.stopOutgoingCallRing();
    this.init();

    const playRing = () => {
      this.playTone(425, 'sine', 1.0, 0.2);
    };

    playRing();
    this.dialToneInterval = setInterval(playRing, 3000);
  }

  stopOutgoingCallRing() {
    if (this.dialToneInterval) {
      clearInterval(this.dialToneInterval);
      this.dialToneInterval = null;
    }
  }

  stopAll() {
    this.stopIncomingCallRing();
    this.stopOutgoingCallRing();
    if (this.msgTimeout) clearTimeout(this.msgTimeout);
  }
}

export const sounds = new SoundService();
