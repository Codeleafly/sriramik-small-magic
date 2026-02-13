export class Bird {
    constructor(canvas, image, soundController) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.x = canvas.width / 3;
        this.y = canvas.height / 2;
        this.velocity = 0;
        this.gravity = 0.5;
        this.jumpStrength = -8;
        this.width = 65; // Increased from 50
        this.height = 50; // Increased from 40
        this.radius = 25; // Increased from 20
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
        
        // Floor check happens in game loop usually, but here too
        if (this.y + this.height/2 >= this.canvas.height) {
            this.y = this.canvas.height - this.height/2;
            this.die(); // Game over logic handled by game loop checking 'dead' or returning status
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
        this.x = this.canvas.width / 3;
        this.y = this.canvas.height / 2;
        this.velocity = 0;
        this.dead = false;
    }
}
