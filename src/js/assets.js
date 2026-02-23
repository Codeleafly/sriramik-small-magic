console.log("Assets System: Initializing v5");

export const getMedalInfo = (score) => {
    if (score >= 40) return { name: 'PLATINUM', src: 'public/assets/medal_platinum.svg' };
    if (score >= 20) return { name: 'GOLD', src: 'public/assets/medal_gold.svg' };
    if (score >= 10) return { name: 'SILVER', src: 'public/assets/medal_silver.svg' };
    if (score >= 5)  return { name: 'BRONZE', src: 'public/assets/medal_bronze.svg' };
    return null;
};

export const Assets = {
    images: {
        bird: new Image(),
        background: new Image(),
        medalBronze: new Image(),
        medalSilver: new Image(),
        medalGold: new Image(),
        medalPlatinum: new Image()
    },
    sounds: {
        background: new Audio('public/assets/music.mp3'),
        score: null, 
        flap: null,  
        die: null    
    },
    
    getMedalInfo: getMedalInfo,

    load: async function() {
        console.log("Assets System: Start Loading...");
        const promises = [];
        
        const assetsToLoad = [
            { obj: this.images.bird, src: 'public/assets/bird.svg', name: 'Bird' },
            { obj: this.images.background, src: 'public/assets/background.svg', name: 'Background' },
            { obj: this.images.medalBronze, src: 'public/assets/medal_bronze.svg', name: 'Bronze Medal' },
            { obj: this.images.medalSilver, src: 'public/assets/medal_silver.svg', name: 'Silver Medal' },
            { obj: this.images.medalGold, src: 'public/assets/medal_gold.svg', name: 'Gold Medal' },
            { obj: this.images.medalPlatinum, src: 'public/assets/medal_platinum.svg', name: 'Platinum Medal' }
        ];

        assetsToLoad.forEach(asset => {
            asset.obj.src = asset.src;
            promises.push(this.loadImagePromise(asset.obj, asset.name));
        });

        this.sounds.background.loop = true;
        this.sounds.background.volume = 0.8;
        
        // Use allSettled to prevent one missing file from breaking the whole game
        const results = await Promise.allSettled(promises);
        results.forEach((result, i) => {
            if (result.status === 'rejected') {
                console.warn(`Assets System: Failed to load ${assetsToLoad[i].name}`, result.reason);
            }
        });
        
        console.log("Assets System: Loading Complete (or partially complete)");
        return true;
    },

    loadImagePromise: function(img, name) {
        return new Promise((resolve, reject) => {
            if (img.complete) {
                resolve();
            } else {
                img.onload = () => {
                    console.log(`Assets System: Loaded ${name}`);
                    resolve();
                };
                img.onerror = (err) => {
                    console.error(`Assets System: Error loading ${name}`);
                    reject(err);
                };
            }
        });
    }
};
