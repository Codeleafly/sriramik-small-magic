import { Database } from './services/db.js';
import { Auth } from './services/auth.js';

const leaderboardList = document.getElementById('leaderboardList');
const loadMoreBtn = document.getElementById('loadMoreBtn');
let currentCount = 0; // Pagination counter for RTDB
let isLoading = false;

async function init() {
    // Load initial scores immediately
    loadScores(true);

    Auth.onAuthStateChanged((user) => {
        if (user) loadScores(true);
    });

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => loadScores(false));
    }
}

async function loadScores(isInitial = false) {
    if (isLoading) return;
    isLoading = true;

    try {
        if (isInitial) {
            leaderboardList.innerHTML = '<div class="leader-row">Fetching players...</div>';
            currentCount = 20;
        } else {
            currentCount += 20;
        }

        const result = await Database.getTopScores(currentCount);
        const { scores } = result;

        if (isInitial) leaderboardList.innerHTML = '';

        if (!scores || scores.length === 0) {
            if (isInitial) leaderboardList.innerHTML = '<div class="leader-row">No scores yet!</div>';
        } else {
            renderScores(scores, isInitial);
        }

        if (loadMoreBtn) {
            loadMoreBtn.style.display = scores.length >= currentCount ? 'block' : 'none';
        }
    } catch (error) {
        console.error("Leaderboard Error:", error);
        leaderboardList.innerHTML = `
            <div class="leader-row" style="color: #e74c3c; flex-direction: column; text-align: center;">
                <p>Failed to load scores.</p>
                <p style="font-size: 7px; margin-top: 5px; opacity: 0.8; font-family: monospace;">
                    ${error.message}
                </p>
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

        // Clean up display name and get initial
        let displayName = scoreData.displayName || 'Anonymous';
        const initial = displayName.charAt(0).toUpperCase();
        if (displayName.length > 15) displayName = displayName.substring(0, 12) + '...';

        row.innerHTML = `
            <span class="rank ${rankClass}">${rank}</span>
            <div class="name">
                ${scoreData.photoURL ? `<img src="${scoreData.photoURL}" alt="" class="leader-avatar">` : `<div class="leader-avatar" style="background: #8B4513; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-family: 'Press Start 2P';">${initial}</div>`}
                <span class="${rankClass}">${displayName}</span>
            </div>
            <span class="score-val ${rankClass}">${scoreData.score}</span>
        `;
        leaderboardList.appendChild(row);
    });
}

init();
