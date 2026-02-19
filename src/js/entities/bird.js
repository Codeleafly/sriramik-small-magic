export class Bird {
    constructor(game, image, soundController) {
        this.game = game;
        this.ctx = game.ctx;
        this.image = image;
        this.soundController = soundController;
        
        this.width = 65;
        this.height = 50;
        this.radius = 22; // Hitbox radius
        
        this.reset();
    }

    reset() {
        this.x = this.game.width / 3;
        this.y = this.game.height / 2;
        this.velocity = 0;
        this.rotation = 0;
        this.dead = false;
    }

    draw() {
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        
        // Dynamic rotation based on velocity (Classic feel)
        if (this.velocity < 0) {
            this.rotation = Math.max(-25 * (Math.PI / 180), this.velocity * 0.08);
        } else {
            this.rotation = Math.min(90 * (Math.PI / 180), this.rotation + (this.velocity * 0.05));
        }
        
        this.ctx.rotate(this.rotation);
        
        if (this.image && this.image.complete) {
            this.ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    update() {
        if (this.dead) return;
        
        this.velocity += this.game.gravity;
        this.y += this.velocity;
    }

    flap() {
        if (this.dead) return;
        
        this.velocity = this.game.jumpImpulse;
        if (this.soundController) {
            this.soundController.playSound('flap');
        }
    }

    die() {
        if (!this.dead) {
            this.dead = true;
            if (this.soundController) {
                this.soundController.playSound('die');
            }
        }
    }
}