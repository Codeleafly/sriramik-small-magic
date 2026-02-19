export class Bird {
    constructor(game, image, soundController) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
        this.x = game.width / 3;
        this.y = game.height / 2;
        
        // Physics constants (tuned for 60fps)
        this.velocity = 0;
        this.gravity = 0.4;        // ~1440 px/sec^2
        this.jumpStrength = -7;    // ~420 px/sec
        
        this.width = 65;           // Restored to previous size
        this.height = 50;
        this.radius = 22;          // Restored to a larger forgiving hitbox
        
        this.rotation = 0;
        this.image = image;
        this.soundController = soundController;
        this.dead = false;
    }

    draw() {
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        
        // Rotation logic: tilt up on jump, tilt down heavily on fall
        if (this.velocity <= 0) {
            this.rotation = Math.max(-25 * (Math.PI / 180), this.velocity * 0.1);
        } else if (this.velocity > 0) {
            this.rotation = Math.min(90 * (Math.PI / 180), this.rotation + this.velocity * 0.05);
        }
        
        this.ctx.rotate(this.rotation);
        
        if (this.image && this.image.complete) {
             // Draw the bird centered
             this.ctx.drawImage(this.image, -this.width/2, -this.height/2, this.width, this.height);
        } else {
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
        
        // Debug hitbox (uncomment for testing)
        // this.ctx.beginPath();
        // this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        // this.ctx.strokeStyle = 'red';
        // this.ctx.stroke();
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
        if (this.y + this.radius >= this.game.height) {
            this.y = this.game.height - this.radius;
            this.die();
            return true;
        }
        return false;
    }

    flap() {
        if (this.dead) return;
        // Non-additive jump: resets velocity to jumpStrength
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
        this.rotation = 0;
        this.dead = false;
    }
}
