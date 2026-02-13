export class Background {
    constructor(canvas, image, speed) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.image = image;
        this.speed = speed;
        this.x = 0;
        this.width = canvas.width;
        this.height = canvas.height;
    }

    draw() {
        if (!this.image.complete) {
             this.ctx.fillStyle = "#70c5ce";
             this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
             return;
        }

        // Draw two images to create seamless scrolling
        this.ctx.drawImage(this.image, this.x, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.image, this.x + this.canvas.width, 0, this.canvas.width, this.canvas.height);
    }

    update() {
        this.x -= this.speed;
        if (this.x <= -this.canvas.width) {
            this.x = 0;
        }
    }
}
