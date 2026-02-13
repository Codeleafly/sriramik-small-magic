import { Bird } from './entities/bird.js';
import { Pipe } from './entities/pipe.js';
import { Background } from './entities/background.js';
import { Assets } from './assets.js';
import { AudioController } from './audio.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.gameRunning = false;
        this.score = 0;
        this.frames = 0;
        this.speed = 2.5;
        this.highScore = parseInt(localStorage.getItem('flappyHighScore')) || 0;
        this.medalCounts = JSON.parse(localStorage.getItem('flappyMedalCounts')) || {
            BRONZE: 0,
            SILVER: 0,
            GOLD: 0,
            PLATINUM: 0
        };
        
        this.audioController = new AudioController();
        this.bird = new Bird(canvas, Assets.images.bird, this.audioController);
        this.pipes = [];
        this.background = new Background(canvas, Assets.images.background, this.speed / 2); // Parallax speed
        
        this.animationId = null;

        // Resize handler
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        // Re-center bird if game not running
        if (!this.gameRunning) {
            this.bird.y = this.height / 2;
        }
    }

    start() {
        if (this.gameRunning) return;
        
        this.gameRunning = true;
        this.score = 0;
        this.frames = 0;
        this.pipes = [];
        this.bird.reset();
        this.bird.y = this.height / 2;
        this.audioController.playBackgroundMusic();
        
        // Hide UI
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('scoreBoard').innerText = '0';
        
        this.bird.flap();
        this.loop();
    }

    loop() {
        if (!this.gameRunning) return;

        this.ctx.clearRect(0, 0, this.width, this.height);

        // Update Background
        this.background.update();
        this.background.draw();

        // Update Bird
        this.bird.update();
        this.bird.draw();
        
        // Check for ground collision
        if (this.bird.y + this.bird.height/2 >= this.height) {
            this.gameOver();
            return;
        }

        // Pipe Logic
        // Only start generating pipes after 200 frames (gives user time to settle)
        if (this.frames > 200 && this.frames % 150 === 0) {
            this.pipes.push(new Pipe(this.canvas, this.speed, this.audioController));
        }

        for (let i = 0; i < this.pipes.length; i++) {
            let pipe = this.pipes[i];
            pipe.update();
            pipe.draw();

            if (pipe.checkCollision(this.bird)) {
                this.gameOver();
                return;
            }

            if (pipe.checkPassed(this.bird)) {
                this.score++;
                document.getElementById('scoreBoard').innerText = this.score;
            }

            if (pipe.x + pipe.width < 0) {
                this.pipes.shift();
                i--;
            }
        }

        this.frames++;
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    stop() {
        this.gameRunning = false;
        cancelAnimationFrame(this.animationId);
        this.audioController.stopBackgroundMusic();
    }

    gameOver() {
        this.stop();
        this.audioController.playSound('die');
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('flappyHighScore', this.highScore);
        }

        const finalScoreEl = document.getElementById('finalScore');
        finalScoreEl.innerText = this.score;
        
        const bestScoreEl = document.getElementById('bestScore');
        bestScoreEl.innerText = this.highScore;

        const medalEl = document.getElementById('medal');
        const medalNameEl = document.getElementById('medalName');
        const noMedalEl = document.getElementById('noMedalPlaceholder');
        
        medalEl.style.display = 'none';
        medalNameEl.innerText = '';
        noMedalEl.style.display = 'block';

        // Medal Logic: 5+ Bronze, 10+ Silver, 20+ Gold, 40+ Platinum
        const medalInfo = this.getMedalInfo(this.score);
        if (medalInfo) {
            medalEl.style.display = 'block';
            noMedalEl.style.display = 'none';
            medalEl.src = medalInfo.src;
            medalNameEl.innerText = medalInfo.name;

            // Increment and save medal count
            this.medalCounts[medalInfo.name]++;
            localStorage.setItem('flappyMedalCounts', JSON.stringify(this.medalCounts));
        }

        document.getElementById('gameOverScreen').style.display = 'block';
    }

    getMedalInfo(score) {
        if (score >= 40) {
            return { name: 'PLATINUM', src: 'public/assets/medal_platinum.svg' };
        } else if (score >= 20) {
            return { name: 'GOLD', src: 'public/assets/medal_gold.svg' };
        } else if (score >= 10) {
            return { name: 'SILVER', src: 'public/assets/medal_silver.svg' };
        } else if (score >= 5) {
            return { name: 'BRONZE', src: 'public/assets/medal_bronze.svg' };
        }
        return null;
    }

    // Input handlers
    flap() {
        if (this.gameRunning) {
            this.bird.flap();
        } else {
            // Can be used to start game if on start screen?
            // Handled by UI usually, but good to have.
        }
    }
}
