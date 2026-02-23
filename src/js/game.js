import { Bird } from './entities/bird.js';
import { Pipe } from './entities/pipe.js';
import { Background } from './entities/background.js';
import { Assets, getMedalInfo } from './assets.js';
import { AudioController } from './audio.js';
import { Auth } from './services/auth.js';
import { Database } from './services/db.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Logical Virtual Resolution (Base for all physics)
        this.width = 0;
        this.height = 0;
        
        this.gameRunning = false;
        this.score = 0;
        this.frames = 0;
        
        // Snappier Physics Constants
        this.speed = 4.5;           // Keep fast pace
        this.gravity = 0.42;        // Slightly lower gravity for smoother fall
        this.jumpImpulse = -6.8;    // Balanced jump (not too high)
        
        this.highScore = 0; // Fetched from Database on init
        this.medalCounts = {
            BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0
        };
        
        // FPS Monitoring
        this.fps = 0;
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fpsText = document.getElementById('fpsText');

        this.audioController = new AudioController();
        this.bird = null;
        this.pipes = [];
        this.background = null;
        
        this.animationId = null;

        window.addEventListener('resize', () => this.resize());
        this.resize();
        
        // Initialize Entities after first resize
        this.bird = new Bird(this, Assets.images.bird, this.audioController);
        this.background = new Background(this, Assets.images.background, this.speed / 2);
    }

    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.width = width;
        this.height = height;

        // Dynamic Scaling for Bird/Pipes based on height
        const scaleFactor = Math.min(1, height / 800);
        if (this.bird) {
            this.bird.width = 65 * scaleFactor;
            this.bird.height = 50 * scaleFactor;
            this.bird.radius = 22 * scaleFactor;
        }

        if (!this.gameRunning && this.bird) {
            this.bird.x = this.width / 3;
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
        this.audioController.playBackgroundMusic();
        
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('scoreBoard').innerText = '0';
        
        this.loop();
    }

    loop() {
        if (!this.gameRunning) return;

        // FPS Calculation
        const now = performance.now();
        this.frameCount++;
        if (now >= this.lastTime + 1000) {
            this.fps = this.frameCount;
            if (this.fpsText) this.fpsText.innerText = this.fps;
            this.frameCount = 0;
            this.lastTime = now;
        }

        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Background
        this.background.update();
        this.background.draw();

        // 2. Bird
        this.bird.update();
        this.bird.draw();
        
        // 3. Pipe Generation (Fast Pacing: Spawns every ~0.9s)
        if (this.frames > 60 && this.frames % 55 === 0) {
            this.pipes.push(new Pipe(this, this.speed, this.audioController));
        }

        // 4. Pipe Management
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

            if (pipe.x + pipe.width < -50) {
                this.pipes.splice(i, 1);
                i--;
            }
        }

        // 5. Floor/Ceiling Collision
        if (this.bird.y + this.bird.radius >= this.height || this.bird.y - this.bird.radius <= 0) {
            this.gameOver();
            return;
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
        }

        // Save high score to Firestore if user is logged in
        if (Auth.user && this.score > 0) {
            console.log("Game Over: Attempting to save score", this.score);
            Database.saveHighScore(Auth.user, this.score);
        }

        document.getElementById('finalScore').innerText = this.score;
        document.getElementById('bestScore').innerText = this.highScore;

        const medalEl = document.getElementById('medal');
        const medalNameEl = document.getElementById('medalName');
        const noMedalEl = document.getElementById('noMedalPlaceholder');
        
        const medalInfo = getMedalInfo(this.score);
        if (medalInfo) {
            medalEl.style.display = 'block';
            noMedalEl.style.display = 'none';
            medalEl.src = medalInfo.src;
            medalNameEl.innerText = medalInfo.name;
        } else {
            medalEl.style.display = 'none';
            noMedalEl.style.display = 'block';
            medalNameEl.innerText = '';
        }

        document.getElementById('gameOverScreen').style.display = 'block';
    }

    flap() {
        if (this.gameRunning) this.bird.flap();
    }
}