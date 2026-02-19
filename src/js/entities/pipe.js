export class Pipe {
    constructor(game, speed, soundController) {
        this.game = game;
        this.ctx = game.ctx;
        this.speed = speed;
        this.soundController = soundController;
        this.x = game.width;
        
        // Original game gap size (approx 105px)
        this.gap = 105; 
        
        // Define random vertical position (safe range for pipes)
        const minPipeHeight = 80;
        const maxPipeHeight = game.height - this.gap - minPipeHeight;
        this.topHeight = minPipeHeight + Math.random() * (maxPipeHeight - minPipeHeight);
        this.bottomY = this.topHeight + this.gap;
        
        this.width = 52;           // Classic pipe width
        this.color = '#73bf2e';
        this.passed = false;
        this.scored = false;
        
        // Forgiving hitbox buffer
        this.hitboxBuffer = 5;
    }

    draw() {
        this.ctx.fillStyle = this.color;
        this.ctx.strokeStyle = '#2d4d12';
        this.ctx.lineWidth = 2;

        // Draw Top Pipe
        this.ctx.fillRect(this.x, 0, this.width, this.topHeight);
        this.ctx.strokeRect(this.x, 0, this.width, this.topHeight);
        
        // Draw Top Pipe Cap
        const capWidth = this.width + 6;
        const capHeight = 24;
        this.ctx.fillRect(this.x - 3, this.topHeight - capHeight, capWidth, capHeight);
        this.ctx.strokeRect(this.x - 3, this.topHeight - capHeight, capWidth, capHeight);

        // Draw Bottom Pipe
        this.ctx.fillRect(this.x, this.bottomY, this.width, this.game.height - this.bottomY);
        this.ctx.strokeRect(this.x, this.bottomY, this.width, this.game.height - this.bottomY);
        
        // Draw Bottom Pipe Cap
        this.ctx.fillRect(this.x - 3, this.bottomY, capWidth, capHeight);
        this.ctx.strokeRect(this.x - 3, this.bottomY, capWidth, capHeight);
    }

    update() {
        this.x -= this.speed;
        if (this.x + this.width < 0) {
            this.passed = true;
        }
    }

    checkCollision(bird) {
        // More forgiving collision detection using a slightly reduced bird hitbox
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
        if (this.x + this.width / 2 < bird.x && !this.scored) {
            this.scored = true;
            if (this.soundController) {
                this.soundController.playSound('score');
            }
            return true;
        }
        return false;
    }
}
