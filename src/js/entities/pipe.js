export class Pipe {
    constructor(game, speed, soundController) {
        this.game = game;
        this.ctx = game.ctx;
        this.speed = speed;
        this.soundController = soundController;
        this.x = game.width;
        
        // Stabilized Difficulty: Balanced gap and random ranges
        this.gapSize = 120;
        this.width = 52;
        this.hitboxBuffer = 5;
        
        // Adaptive height calculation
        const minPipeHeight = 80;
        const maxPipeHeight = game.height - this.gapSize - minPipeHeight;
        
        this.topHeight = minPipeHeight + Math.random() * (maxPipeHeight - minPipeHeight);
        this.bottomY = this.topHeight + this.gapSize;
        
        this.color = '#73bf2e';
        this.passed = false;
        this.scored = false;
    }

    draw() {
        this.ctx.fillStyle = this.color;
        this.ctx.strokeStyle = '#2d4d12';
        this.ctx.lineWidth = 2;

        // Draw Pipes
        this.drawPipe(this.x, 0, this.width, this.topHeight, true);
        this.drawPipe(this.x, this.bottomY, this.width, this.game.height - this.bottomY, false);
    }

    drawPipe(x, y, w, h, isTop) {
        this.ctx.fillRect(x, y, w, h);
        this.ctx.strokeRect(x, y, w, h);
        
        // Draw Pipe Caps (Aesthetic update)
        const capWidth = w + 6;
        const capHeight = 24;
        const capX = x - 3;
        const capY = isTop ? y + h - capHeight : y;
        
        this.ctx.fillRect(capX, capY, capWidth, capHeight);
        this.ctx.strokeRect(capX, capY, capWidth, capHeight);
    }

    update() {
        this.x -= this.speed;
        if (this.x + this.width < 0) {
            this.passed = true;
        }
    }

    checkCollision(bird) {
        // Simplified, accurate collision with small buffer for "forgiveness"
        const birdLeft = bird.x - bird.radius + this.hitboxBuffer;
        const birdRight = bird.x + bird.radius - this.hitboxBuffer;
        const birdTop = bird.y - bird.radius + this.hitboxBuffer;
        const birdBottom = bird.y + bird.radius - this.hitboxBuffer;

        const pipeLeft = this.x;
        const pipeRight = this.x + this.width;

        if (birdRight > pipeLeft && birdLeft < pipeRight) {
            if (birdTop < this.topHeight || birdBottom > this.bottomY) {
                return true;
            }
        }
        return false;
    }

    checkPassed(bird) {
        if (this.x + (this.width / 2) < bird.x && !this.scored) {
            this.scored = true;
            if (this.soundController) {
                this.soundController.playSound('score');
            }
            return true;
        }
        return false;
    }
}