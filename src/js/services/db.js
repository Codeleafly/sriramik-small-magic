import { 
    ref, 
    set, 
    get, 
    onValue, 
    query, 
    orderByChild, 
    limitToLast,
    update
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from "../firebase-config.js";

export const Database = {
    async saveUserProfile(user, displayName, photoURL = null) {
        if (!user || !user.uid) return;
        console.log("DB: Saving User Profile...");
        const scoreRef = ref(db, `scores/${user.uid}`);
        try {
            const data = {
                uid: user.uid,
                displayName: displayName || user.displayName || 'Anonymous',
                timestamp: Date.now()
            };
            if (photoURL) {
                data.photoURL = photoURL;
            } else if (user.photoURL) {
                data.photoURL = user.photoURL;
            }
            await update(scoreRef, data);
            console.log("DB: Profile Saved.");
        } catch (e) {
            console.error("DB: Error saving user profile:", e);
        }
    },

    async getUserScore(user) {
        if (!user || !user.uid) return 0;
        console.log("DB: Getting User Score...");
        const scoreRef = ref(db, `scores/${user.uid}`);
        try {
            const snapshot = await get(scoreRef);
            if (snapshot.exists()) {
                const val = snapshot.val();
                return val.score || 0;
            }
        } catch (e) {
            console.error("DB: Error getting user score:", e);
        }
        return 0;
    },

    async saveHighScore(user, score) {
        if (!user || !user.uid) return;
        console.log(`DB: Attempting to save High Score: ${score}`);
        const scoreRef = ref(db, `scores/${user.uid}`);
        
        try {
            const snapshot = await get(scoreRef);
            const scoreData = {
                score: score,
                timestamp: Date.now()
            };

            if (snapshot.exists()) {
                const currentData = snapshot.val();
                if (score > (currentData.score || 0)) {
                    await update(scoreRef, scoreData);
                    console.log("DB: High Score Updated.");
                } else {
                    console.log("DB: Current score is not higher than cloud record.");
                }
            } else {
                const fullData = {
                    uid: user.uid,
                    displayName: user.displayName || 'Anonymous',
                    photoURL: user.photoURL || null,
                    score: score,
                    timestamp: Date.now()
                };
                await set(scoreRef, fullData);
                console.log("DB: Initial Score Saved.");
            }
        } catch (e) {
            console.error("DB: Error saving score:", e);
        }
    },

    async getTopScores(limitCount = 10) {
        console.log(`DB: Fetching Top ${limitCount} Scores...`);
        const scoresRef = ref(db, 'scores');
        // Firebase Realtime Database sorts in ascending order.
        // To get top scores (descending), we use limitToLast which fetches the highest values.
        const topScoresQuery = query(scoresRef, orderByChild('score'), limitToLast(limitCount));
        
        try {
            const snapshot = await get(topScoresQuery);
            const scores = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const data = childSnapshot.val();
                    if (data && typeof data.score === 'number') {
                        scores.push({ id: childSnapshot.key, ...data });
                    }
                });
                // Sort the limited results DESCENDING (highest first) for the UI
                scores.sort((a, b) => b.score - a.score);
            }
            console.log(`DB: Fetched ${scores.length} scores from server.`);
            return { scores: scores };
        } catch (error) {
            console.error("DB: Error getting top scores:", error);
            return { scores: [] };
        }
    }
};
