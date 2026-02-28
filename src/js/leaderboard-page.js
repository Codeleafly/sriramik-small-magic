import { Database } from './services/db.js';
import { Auth } from './services/auth.js';
import { getMedalInfo } from './assets.js';
import { clearAllCookies } from './utils/storage-cleaner.js';

const leaderboardList = document.getElementById('leaderboardList');
let currentLimit = 10; 
let isLoading = false;
let hasMore = true; // Track if more scores might be available

async function init() {
    clearAllCookies();
    console.log("Leaderboard: Initializing...");
    
    // Initial load
    loadScores(true);

    Auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("Leaderboard: Auth changed, reloading scores...");
            loadScores(true);
        }
    });

    // Infinite Scroll Logic
    if (leaderboardList) {
        leaderboardList.addEventListener('scroll', () => {
            if (isLoading || !hasMore) return;
            
            // Check if we are near the bottom of the scrollable container
            const { scrollTop, scrollHeight, clientHeight } = leaderboardList;
            if (scrollTop + clientHeight >= scrollHeight - 20) {
                console.log("Leaderboard: Scroll bottom reached, loading more...");
                currentLimit += 10;
                loadScores(false);
            }
        });
    }
}

async function loadScores(isInitial = false) {
    if (isLoading) return;
    isLoading = true;

    try {
        if (isInitial) {
            leaderboardList.innerHTML = '<div class="leader-row" style="justify-content: center;">Fetching Top Players...</div>';
            currentLimit = 10;
            hasMore = true;
        }

        console.log(`Leaderboard: Fetching Top ${currentLimit} scores...`);
        const result = await Database.getTopScores(currentLimit);
        const scores = result.scores || [];

        console.log(`Leaderboard: Received ${scores.length} scores.`);

        // If we got fewer scores than requested, we've reached the end
        if (scores.length < currentLimit) {
            hasMore = false;
        }

        // Always clear before rendering the full set of scores to maintain order/rank
        leaderboardList.innerHTML = '';

        if (scores.length === 0) {
            leaderboardList.innerHTML = '<div class="leader-row" style="justify-content: center;">No scores found yet!</div>';
        } else {
            renderScores(scores, false);
        }
    } catch (error) {
        console.error("Leaderboard Error:", error);
        leaderboardList.innerHTML = `
            <div class="leader-row" style="color: #e74c3c; flex-direction: column; text-align: center; gap: 10px; padding: 20px;">
                <p>Connection Error</p>
                <button onclick="location.reload()" class="btn" style="font-size: 8px; padding: 10px;">RETRY</button>
            </div>
        `;
    } finally {
        isLoading = false;
    }
}

function renderScores(scores, clear) {
    if (clear) leaderboardList.innerHTML = '';
    
    scores.forEach((scoreData, index) => {
        const rank = index + 1;
        const row = document.createElement('div');
        row.classList.add('leader-row');
        
        // Highlight top 3
        let rankClass = "";
        if (rank === 1) rankClass = "rank-1";
        else if (rank === 2) rankClass = "rank-2";
        else if (rank === 3) rankClass = "rank-3";

        // Get Medal
        const medal = getMedalInfo(scoreData.score);
        const medalHtml = medal ? `<img src="${medal.src}" style="width: 18px; height: 18px; margin-left: 5px;" alt="${medal.name}">` : '';

        // Name and Initials
        let displayName = scoreData.displayName || 'Anonymous';
        const nameParts = displayName.trim().split(/\s+/);
        let initial = "";
        if (nameParts.length > 0) {
            initial += nameParts[0].charAt(0).toUpperCase();
            if (nameParts.length > 1) {
                initial += nameParts[nameParts.length - 1].charAt(0).toUpperCase();
            }
        } else { initial = "?"; }

        if (displayName.length > 15) displayName = displayName.substring(0, 12) + '...';

        row.innerHTML = `
            <span class="rank ${rankClass}">${rank}</span>
            <div class="name">
                ${scoreData.photoURL ? `<img src="${scoreData.photoURL}" alt="" class="leader-avatar">` : `<div class="leader-avatar" style="background: #8B4513; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-family: 'Press Start 2P';">${initial}</div>`}
                <span class="${rankClass}">${displayName}</span>
            </div>
            <div class="score-val ${rankClass}" style="display: flex; align-items: center; justify-content: flex-end;">
                ${scoreData.score}
                ${medalHtml}
            </div>
        `;
        leaderboardList.appendChild(row);
    });
}

init();
