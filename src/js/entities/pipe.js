export class Pipe {
    constructor(game, speed, soundController) {
        this.game = game;
        this.ctx = game.ctx;
        this.speed = speed;
        this.soundController = soundController;
        this.x = game.width;
        
        // Dynamic gap sizing and positioning
        const gap = 180 + Math.random() * 60; // Slightly varying gap for interest
        const minPipeHeight = 50;
        this.topHeight = minPipeHeight + Math.random() * (game.height - gap - minPipeHeight * 2);
        this.bottomY = this.topHeight + gap;
        
        this.width = 80;
        this.color = '#73bf2e';
        this.passed = false;
        this.scored = false;
    }

    draw() {
        this.ctx.fillStyle = this.color;
        this.ctx.strokeStyle = '#558c22';
        this.ctx.lineWidth = 3;

        // Top Pipe
        this.ctx.fillRect(this.x, 0, this.width, this.topHeight);
        this.ctx.strokeRect(this.x, 0, this.width, this.topHeight);
        
        // Bottom Pipe
        this.ctx.fillRect(this.x, this.bottomY, this.width, this.game.height - this.bottomY);
        this.ctx.strokeRect(this.x, this.bottomY, this.width, this.game.height - this.bottomY);
    }

    update() {
        this.x -= this.speed;
        if (this.x + this.width < 0) {
            this.passed = true;
        }
    }

    checkCollision(bird) {
        if (bird.x + bird.width/2 > this.x && bird.x - bird.width/2 < this.x + this.width) {
            if (bird.y - bird.height/2 < this.topHeight || bird.y + bird.height/2 > this.bottomY) {
                return true;
            }
        }
        return false;
    }

    checkPassed(bird) {
        if (this.x + this.width < bird.x && !this.scored) {
            this.scored = true;
            if (this.soundController) {
                this.soundController.playSound('score');
            }
            return true;
        }
        return false;
    }
}
