import { 
    ref, 
    set, 
    get, 
    onValue, 
    query, 
    orderByChild, 
    limitToLast,
    startAfter,
    endBefore,
    update
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from "../firebase-config.js";

export const Database = {
    async saveHighScore(user, score) {
        if (!user || !user.uid) return;

        const scoreRef = ref(db, `scores/${user.uid}`);
        
        try {
            // Check if user already has a high score in the cloud
            const snapshot = await get(scoreRef);
            
            const scoreData = {
                uid: user.uid,
                displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
                photoURL: user.photoURL || null,
                score: score,
                timestamp: Date.now()
            };

            if (snapshot.exists()) {
                const currentData = snapshot.val();
                if (score > (currentData.score || 0)) {
                    await update(scoreRef, scoreData);
                    console.log("High score updated in Realtime Database! New:", score, "Old:", currentData.score);
                } else {
                    console.log("Current score", score, "is not higher than cloud score", currentData.score);
                }
            } else {
                await set(scoreRef, scoreData);
                console.log("Initial high score saved in Realtime Database:", score);
            }
        } catch (e) {
            console.error("Error saving score to RTDB: ", e);
        }
    },

    // Real-time listener for top scores
    listenToTopScores(callback, limitCount = 10) {
        // In RTDB, orderByChild works ascending by default. 
        // We limit to last to get highest scores.
        const scoresRef = query(
            ref(db, 'scores'), 
            orderByChild('score'), 
            limitToLast(limitCount)
        );
        
        return onValue(scoresRef, (snapshot) => {
            const scores = [];
            snapshot.forEach((childSnapshot) => {
                scores.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
            // RTDB returns in ascending order, so reverse it for leaderboard
            scores.reverse();
            callback({ scores });
        }, (error) => {
            console.error("RTDB Leaderboard listener error:", error);
        });
    },

    async getTopScores(limitCount = 20) {
        const scoresRef = query(
            ref(db, 'scores'), 
            orderByChild('score'), 
            limitToLast(limitCount)
        );
        try {
            const snapshot = await get(scoresRef);
            const scores = [];
            snapshot.forEach((childSnapshot) => {
                scores.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
            scores.reverse();
            return { scores };
        } catch (e) {
            console.error("Error getting scores from RTDB:", e);
            throw e;
        }
    },

    // Simplified for RTDB (Realtime DB pagination is complex, using a simple limit expansion for now)
    async getMoreScores(currentCount, limitCount = 20) {
        const nextLimit = currentCount + limitCount;
        return this.getTopScores(nextLimit);
    }
};
