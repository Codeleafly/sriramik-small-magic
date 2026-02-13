export const Assets = {
    images: {
        bird: new Image(),
        background: new Image(),
        medalBronze: new Image(),
        medalSilver: new Image(),
        medalGold: new Image(),
        medalPlatinum: new Image(),
        message: new Image()
    },
    sounds: {
        background: new Audio('public/assets/music.mp3'),
        score: null, // Will be generated
        flap: null,  // Will be generated
        die: null    // Will be generated
    },
    
    load: function() {
        const promises = [];

        // Load Images
        this.images.bird.src = 'public/assets/bird.svg';
        promises.push(this.loadImagePromise(this.images.bird));

        this.images.background.src = 'public/assets/background.svg';
        promises.push(this.loadImagePromise(this.images.background));
        
        this.images.medalBronze.src = 'public/assets/medal_bronze.svg';
        promises.push(this.loadImagePromise(this.images.medalBronze));

        this.images.medalSilver.src = 'public/assets/medal_silver.svg';
        promises.push(this.loadImagePromise(this.images.medalSilver));

        this.images.medalGold.src = 'public/assets/medal_gold.svg';
        promises.push(this.loadImagePromise(this.images.medalGold));

        this.images.medalPlatinum.src = 'public/assets/medal_platinum.svg';
        promises.push(this.loadImagePromise(this.images.medalPlatinum));

        this.images.message.src = 'public/assets/message.svg';
        promises.push(this.loadImagePromise(this.images.message));

        // Load Audio
        this.sounds.background.loop = true;
        this.sounds.background.volume = 0.8;

        // Generate synthetic sounds for now if we don't have files
        // (User asked for custom sound effects, I'll synthesize them using AudioContext in audio.js, 
        // or just placeholder objects here. Let's handle them in audio.js)

        return Promise.all(promises);
    },

    loadImagePromise: function(img) {
        return new Promise((resolve, reject) => {
            if (img.complete) {
                resolve();
            } else {
                img.onload = resolve;
                img.onerror = reject;
            }
        });
    }
};
