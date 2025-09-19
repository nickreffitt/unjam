/**
 * SoundPlayer utility for playing notification sounds across the application
 */
export class SoundPlayer {
  private static instance: SoundPlayer | null = null;
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;

  private constructor() {
    // Initialize AudioContext on first interaction
    this.initializeAudioContext();
  }

  /**
   * Get singleton instance of SoundPlayer
   */
  public static getInstance(): SoundPlayer {
    if (!SoundPlayer.instance) {
      SoundPlayer.instance = new SoundPlayer();
    }
    return SoundPlayer.instance;
  }

  /**
   * Initialize AudioContext for sound playback
   */
  private initializeAudioContext(): void {
    try {
      // Create AudioContext with user interaction
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      // Resume AudioContext on user interaction if suspended
      if (this.audioContext.state === 'suspended') {
        document.addEventListener('click', this.resumeAudioContext.bind(this), { once: true });
        document.addEventListener('keydown', this.resumeAudioContext.bind(this), { once: true });
      }
    } catch (error) {
      console.warn('AudioContext not supported:', error);
      this.audioContext = null;
    }
  }

  /**
   * Resume AudioContext after user interaction
   */
  private async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.debug('AudioContext resumed');
      } catch (error) {
        console.warn('Failed to resume AudioContext:', error);
      }
    }
  }

  /**
   * Play a notification sound using Web Audio API
   * Creates a simple tone for cross-browser compatibility
   */
  public async playNotification(): Promise<void> {
    if (!this.isEnabled || !this.audioContext) {
      return;
    }

    try {
      // Resume context if needed
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create a pleasant notification tone (C major chord)
      const oscillator1 = this.audioContext.createOscillator();
      const oscillator2 = this.audioContext.createOscillator();
      const oscillator3 = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Connect oscillators to gain node
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      oscillator3.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Set frequencies for C major chord (C4, E4, G4)
      oscillator1.frequency.setValueAtTime(261.63, this.audioContext.currentTime); // C4
      oscillator2.frequency.setValueAtTime(329.63, this.audioContext.currentTime); // E4
      oscillator3.frequency.setValueAtTime(392.00, this.audioContext.currentTime); // G4

      // Set waveform to sine for pleasant sound
      oscillator1.type = 'sine';
      oscillator2.type = 'sine';
      oscillator3.type = 'sine';

      // Create envelope for smooth sound
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05); // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3); // Decay

      // Start and stop oscillators
      oscillator1.start(now);
      oscillator2.start(now);
      oscillator3.start(now);

      oscillator1.stop(now + 0.3);
      oscillator2.stop(now + 0.3);
      oscillator3.stop(now + 0.3);

      console.debug('Played notification sound');
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  /**
   * Play a simple beep sound
   */
  public async playBeep(frequency: number = 800, duration: number = 200): Promise<void> {
    if (!this.isEnabled || !this.audioContext) {
      return;
    }

    try {
      // Resume context if needed
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = 'sine';

      // Create envelope
      const now = this.audioContext.currentTime;
      const durationSeconds = duration / 1000;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + durationSeconds);

      oscillator.start(now);
      oscillator.stop(now + durationSeconds);

      console.debug(`Played beep sound: ${frequency}Hz for ${duration}ms`);
    } catch (error) {
      console.warn('Failed to play beep sound:', error);
    }
  }

  /**
   * Enable or disable sound notifications
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.debug(`Sound notifications ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if sound notifications are enabled
   */
  public isNotificationEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Check if AudioContext is available
   */
  public isAudioContextAvailable(): boolean {
    return this.audioContext !== null;
  }
}

// Export singleton instance for convenience
export const soundPlayer = SoundPlayer.getInstance();