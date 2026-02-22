import { Database } from './services/db.js';
import { Auth } from './services/auth.js';

const leaderboardList = document.getElementById('leaderboardList');
const loadMoreBtn = document.getElementById('loadMoreBtn');
let currentCount = 0; // Pagination counter for RTDB
let isLoading = false;

async function init() {
    // We don't necessarily need the user to be logged in to VIEW the leaderboard,
    // but Firestore rules might require it. Let's check auth state.
    Auth.onAuthStateChanged(async (user) => {
        // Load initial top 20
        loadScores(true);
    });

    loadMoreBtn.addEventListener('click', () => loadScores(false));
}

async function loadScores(isInitial = false) {
    if (isLoading) return;
    isLoading = true;

    try {
        let result;
        if (isInitial) {
            leaderboardList.innerHTML = '<div class="leader-row">Fetching top players...</div>';
            currentCount = 20;
            result = await Database.getTopScores(currentCount);
        } else {
            currentCount += 20;
            result = await Database.getMoreScores(currentCount, 20);
        }

        const { scores } = result;

        if (isInitial) leaderboardList.innerHTML = '';

        if (scores.length === 0 && isInitial) {
            leaderboardList.innerHTML = '<div class="leader-row">No scores recorded yet! Be the first!</div>';
        } else {
            renderScores(scores, isInitial);
        }

        // Show Load More if we still have scores matching the current limit
        loadMoreBtn.style.display = scores.length >= currentCount ? 'block' : 'none';
    } catch (error) {
        console.error("Error loading leaderboard:", error);
        leaderboardList.innerHTML = '<div class="leader-row" style="color: red;">Failed to load leaderboard. Please try again later.</div>';
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

        // Clean up display name if it's too long
        let displayName = scoreData.displayName || 'Anonymous';
        if (displayName.length > 15) displayName = displayName.substring(0, 12) + '...';

        row.innerHTML = `
            <span class="rank ${rankClass}">${rank}</span>
            <div class="name">
                ${scoreData.photoURL ? `<img src="${scoreData.photoURL}" alt="" class="leader-avatar">` : '<div class="leader-avatar" style="background: #8B4513; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">?</div>'}
                <span class="${rankClass}">${displayName}</span>
            </div>
            <span class="score-val ${rankClass}">${scoreData.score}</span>
        `;
        leaderboardList.appendChild(row);
    });
}

init();
