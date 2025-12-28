const menuMusicUrl = '/assets/audio/menu-space.wav';
const gameMusicUrl = '/assets/sounds/new-age-space-144112.mp3';
const gameOverUrl = '/assets/audio/game-over.wav';
const laserUrl = '/assets/audio/laser.wav';
const explosionUrl = '/assets/audio/explosion.wav';
const mistakeUrl = '/assets/audio/mistake.wav';

class SoundManager {
  constructor() {
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.scene = null;
    this.musicAudio = null;
    this.gameMusicAudio = null;
    this.baseSfx = {};
    this._unlocked = false;
  }

  init(sceneEl) {
    this.scene = sceneEl;
    this.musicEnabled = this._loadBool('musicEnabled', true);
    this.sfxEnabled = this._loadBool('sfxEnabled', true);

    this.musicAudio = new Audio(menuMusicUrl);
    this.musicAudio.loop = true;
    this.musicAudio.volume = 0.32;

    this.gameMusicAudio = new Audio(gameMusicUrl);
    this.gameMusicAudio.loop = true;
    this.gameMusicAudio.volume = 0.32;

    this.baseSfx = {
      laser: new Audio(laserUrl),
      explosion: new Audio(explosionUrl),
      gameover: new Audio(gameOverUrl),
      mistake: new Audio(mistakeUrl)
    };

    this._bindUnlock();
    this._attachSceneListeners();
  }

  _attachSceneListeners() {
    if (!this.scene) return;
    this.scene.addEventListener('sound-explosion', () => this.playSfx('explosion', 0.75));
    this.scene.addEventListener('sound-mistake', () => this.playSfx('mistake', 0.6));
    this.scene.addEventListener('sound-laser', () => this.playSfx('laser', 0.7, 1.2));
    this.scene.addEventListener('game-start', () => {
      this.stopMenuMusic();
      this.playGameMusic();
    });
    this.scene.addEventListener('game-over', () => {
      this.stopGameMusic();
      this.playSfx('gameover', 0.8);
      setTimeout(() => this.playMenuMusic(), 900);
    });
  }

  _bindUnlock() {
    const unlock = () => {
      if (this._unlocked) return;
      this._unlocked = true;
      if (this.musicEnabled) {
        this.musicAudio?.play().catch((err) => console.warn('Music unlock failed', err));
        this.gameMusicAudio?.play().catch((err) => console.warn('Game music unlock failed', err));
        // Pause game music immediately after unlock - it will play when game starts
        if (this.gameMusicAudio) {
          this.gameMusicAudio.pause();
          this.gameMusicAudio.currentTime = 0;
        }
      }
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
  }

  _loadBool(key, fallback) {
    try {
      const stored = localStorage.getItem(`td_sound_${key}`);
      if (stored === null) return fallback;
      return stored === 'true';
    } catch (e) {
      return fallback;
    }
  }

  _saveBool(key, value) {
    try {
      localStorage.setItem(`td_sound_${key}`, value ? 'true' : 'false');
    } catch (e) {}
  }

  playMenuMusic() {
    if (!this.musicEnabled || !this.musicAudio) return;
    this.stopGameMusic(); // Stop game music when menu music plays
    this.musicAudio.currentTime = 0;
    this.musicAudio.play().catch((err) => console.warn('Music playback failed', err));
  }

  stopMenuMusic() {
    if (this.musicAudio) {
      this.musicAudio.pause();
    }
  }

  playGameMusic() {
    if (!this.musicEnabled || !this.gameMusicAudio) return;
    this.stopMenuMusic(); // Stop menu music when game music plays
    this.gameMusicAudio.currentTime = 0;
    this.gameMusicAudio.play().catch((err) => console.warn('Game music playback failed', err));
  }

  stopGameMusic() {
    if (this.gameMusicAudio) {
      this.gameMusicAudio.pause();
    }
  }

  playSfx(name, volume = 1, rate = 1) {
    if (!this.sfxEnabled) return;
    const base = this.baseSfx[name];
    if (!base) return;
    const inst = base.cloneNode(true);
    inst.volume = volume;
    inst.playbackRate = rate;
    inst.play().catch((err) => console.warn(`SFX playback failed (${name})`, err));
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = !!enabled;
    this._saveBool('musicEnabled', this.musicEnabled);
    if (!this.musicEnabled) {
      this.stopMenuMusic();
      this.stopGameMusic();
    } else {
      // Only play menu music if we're in menu state (game music will play when game starts)
      const isPlaying = this.scene && this.scene.systems && this.scene.systems['game-state'] && 
                        this.scene.systems['game-state'].state === 'PLAYING';
      if (!isPlaying) {
        this.playMenuMusic();
      } else {
        this.playGameMusic();
      }
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = !!enabled;
    this._saveBool('sfxEnabled', this.sfxEnabled);
  }

  getSettings() {
    return {
      musicEnabled: this.musicEnabled,
      sfxEnabled: this.sfxEnabled
    };
  }
}

export default new SoundManager();
