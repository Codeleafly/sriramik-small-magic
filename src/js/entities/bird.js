export class Bird {
    constructor(game, image, soundController) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
        this.x = game.width / 3;
        this.y = game.height / 2;
        this.velocity = 0;
        this.gravity = 0.5;
        this.jumpStrength = -8;
        this.width = 65;
        this.height = 50;
        this.radius = 25;
        this.image = image;
        this.soundController = soundController;
        this.dead = false;
    }

    draw() {
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        this.ctx.rotate(rotation);
        
        if (this.image && this.image.complete) {
             this.ctx.drawImage(this.image, -this.width/2, -this.height/2, this.width, this.height);
        } else {
            this.ctx.fillStyle = '#f1c40f'; // Fallback color
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    update() {
        if (this.dead) return;

        this.velocity += this.gravity;
        this.y += this.velocity;
        
        // Ceiling check
        if (this.y < 0) { 
            this.y = 0; 
            this.velocity = 0; 
        }
        
        // Floor check
        if (this.y + this.height/2 >= this.game.height) {
            this.y = this.game.height - this.height/2;
            this.die();
            return true; // Hit ground
        }
        return false;
    }

    flap() {
        if (this.dead) return;
        this.velocity = this.jumpStrength;
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

    reset() {
        this.x = this.game.width / 3;
        this.y = this.game.height / 2;
        this.velocity = 0;
        this.dead = false;
    }
}
