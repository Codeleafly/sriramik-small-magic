export class Background {
    constructor(game, image, speed) {
        this.game = game;
        this.ctx = game.ctx;
        this.image = image;
        this.speed = speed;
        this.x = 0;
    }

    draw() {
        if (!this.image.complete) {
             this.ctx.fillStyle = "#70c5ce";
             this.ctx.fillRect(0, 0, this.game.width, this.game.height);
             return;
        }

        // Draw two images to create seamless scrolling
        this.ctx.drawImage(this.image, this.x, 0, this.game.width, this.game.height);
        this.ctx.drawImage(this.image, this.x + this.game.width, 0, this.game.width, this.game.height);
    }

    update() {
        this.x -= this.speed;
        if (this.x <= -this.game.width) {
            this.x = 0;
        }
    }
}
