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
        this.speed = 3.5;          // ~210px/sec at 60fps
        this.highScore = parseInt(localStorage.getItem('flappyHighScore')) || 0;
        
        // FPS Counter
        this.fps = 0;
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fpsText = document.getElementById('fpsText');

        this.medalCounts = JSON.parse(localStorage.getItem('flappyMedalCounts')) || {
            BRONZE: 0,
            SILVER: 0,
            GOLD: 0,
            PLATINUM: 0
        };
        
        this.audioController = new AudioController();
        this.bird = new Bird(this, Assets.images.bird, this.audioController);
        this.pipes = [];
        this.background = new Background(this, Assets.images.background, this.speed / 2); // Parallax speed
        
        this.animationId = null;

        // Resize handler
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        // Set canvas dimensions to viewport size
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Handle high DPI screens
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.ctx.scale(dpr, dpr);
        
        // Update logical dimensions
        this.width = width;
        this.height = height;

        // Re-center bird if game not running
        if (!this.gameRunning && this.bird) {
            this.bird.y = this.height / 2;
            this.bird.x = this.width / 3;
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

        // Calculate FPS
        const now = performance.now();
        this.frameCount++;
        if (now >= this.lastTime + 1000) {
            this.fps = this.frameCount;
            if (this.fpsText) this.fpsText.innerText = this.fps;
            this.frameCount = 0;
            this.lastTime = now;
        }

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
        // Start generating pipes after ~2.5 seconds (150 frames)
        if (this.frames > 150 && this.frames % 90 === 0) {
            this.pipes.push(new Pipe(this, this.speed, this.audioController));
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
