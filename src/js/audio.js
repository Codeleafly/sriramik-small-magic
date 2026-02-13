export class AudioController {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.bgMusic = new Audio('public/assets/music.mp3');
        this.bgMusic.loop = true;
        this.bgMusic.volume = 1.0;
        
        // Check if user has interacted to unlock AudioContext
        this.unlocked = false;
        
        document.addEventListener('click', () => {
            if (!this.unlocked) {
                this.ctx.resume().then(() => {
                    this.unlocked = true;
                });
            }
        }, { once: true });
    }

    playBackgroundMusic() {
        this.bgMusic.play().catch(e => console.log("Audio play failed (user interaction needed first):", e));
    }

    stopBackgroundMusic() {
        this.bgMusic.pause();
        this.bgMusic.currentTime = 0;
    }

    playSound(type) {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        const now = this.ctx.currentTime;

        if (type === 'flap') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'score') {
            osc.type = 'square'; // Distinctive sound
            osc.frequency.setValueAtTime(800, now); // Higher pitch
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15); // Short decay
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'die') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.3); // Pitch drop
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
    }
}
