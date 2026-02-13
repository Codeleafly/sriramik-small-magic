export class Pipe {
    constructor(canvas, speed, soundController) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.speed = speed;
        this.soundController = soundController;
        this.x = canvas.width;
        this.topHeight = Math.random() * (canvas.height / 2);
        this.bottomY = this.topHeight + 220; // Gap height
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
        this.ctx.fillRect(this.x - 5, this.topHeight - 30, this.width + 10, 30);
        this.ctx.strokeRect(this.x - 5, this.topHeight - 30, this.width + 10, 30);

        // Bottom Pipe
        this.ctx.fillRect(this.x, this.bottomY, this.width, this.canvas.height - this.bottomY);
        this.ctx.strokeRect(this.x, this.bottomY, this.width, this.canvas.height - this.bottomY);
        this.ctx.fillRect(this.x - 5, this.bottomY, this.width + 10, 30);
        this.ctx.strokeRect(this.x - 5, this.bottomY, this.width + 10, 30);
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
