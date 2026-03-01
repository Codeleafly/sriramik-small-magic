import { Game } from './game.js';
import { Assets, getMedalInfo } from './assets.js';
import { Auth } from './services/auth.js';
import { Database } from './services/db.js';
import { clearAllCookies } from './utils/storage-cleaner.js';

// --- GLOBAL VARIABLES ---
let game;
let isCameraReady = false;
let isPinching = false;
let lastActionTime = 0;
let lastStartTrigger = 0;
let currentUser = null;
let deferredPrompt;
let leaderboardUnsubscribe = null;

// --- DOM ELEMENTS ---
const loadingOverlay = document.getElementById('loadingOverlay');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');

// Auth UI Elements
const logoutBtn = document.getElementById('logoutBtn');

// Game UI Elements
const startBtn = document.getElementById('startBtn');
const installBtn = document.getElementById('installBtn');
const enableCameraBtn = document.getElementById('enableCameraBtn');
const cameraBox = document.getElementById('cameraBox');
const cameraLoader = document.getElementById('cameraLoader');
const statusText = document.getElementById('statusText');
const gestureHint = document.getElementById('gestureHint');

// --- UI MANAGEMENT ---
function showUI(screenId) {
    console.log(`UI: Showing ${screenId}`);
    const screens = ['startScreen', 'gameOverScreen', 'loadingOverlay'];
    screens.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === screenId) {
                el.style.display = 'block';
                // Trigger opacity for transitions if needed
                if (id === 'loadingOverlay') el.style.opacity = '1';
            } else {
                if (id === 'loadingOverlay') {
                    el.style.opacity = '0';
                    setTimeout(() => el.style.display = 'none', 500);
                } else {
                    el.style.display = 'none';
                }
            }
        }
    });
}

// --- INITIALIZATION ---
async function init() {
    console.log("App: Initializing...");
    clearAllCookies();
    
    // ONE-TIME MIGRATION: Clear old localStorage high scores to force DB sync
    if (localStorage.getItem('flapfingHighScore') || localStorage.getItem('flapfingMedalCounts')) {
        console.log("App: Cleaning legacy local storage...");
        localStorage.removeItem('flapfingHighScore');
        localStorage.removeItem('flapfingMedalCounts');
    }

    // Safety Timeout: Hide loading overlay if it takes too long (8 seconds)
    const safetyTimeout = setTimeout(() => {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay && overlay.style.display !== 'none') {
            console.warn("App: Loading taking too long, forcing overlay hide.");
            showUI('startScreen');
        }
    }, 8000);

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('App: SW Registered'))
                .catch(err => console.log('App: SW Registration Failed', err));
        });
    }

    // Handle PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (currentUser && installBtn) installBtn.style.display = 'block';
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`App: User response to install prompt: ${outcome}`);
                deferredPrompt = null;
                installBtn.style.display = 'none';
            }
        });
    }

    // Initialize Auth State Listener FIRST
    Auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        
        if (!user) {
            console.log("App: User logged out, redirecting to login...");
            window.location.href = 'login.html';
            return;
        }

        // Check for Session Expiry (5 days)
        if (Auth.isSessionExpired()) {
            console.log("App: Session expired (5 days limit), logging out...");
            localStorage.removeItem('flapfingLoginTime');
            await Auth.logout();
            window.location.href = 'login.html';
            return;
        }

        try {
            console.log("App: User logged in:", user.email);
            
            // Parallelize UI setup and asset loading
            if (deferredPrompt && installBtn) installBtn.style.display = 'block';

            // 1. Load Assets (essential)
            console.log("App: Loading assets...");
            try {
                await Assets.load();
            } catch (e) {
                console.error("App: Asset loading failed, continuing anyway", e);
            }
            
            // 2. Init Game Instance
            if (!game) {
                const canvas = document.getElementById('gameCanvas');
                console.log("App: Creating game instance...");
                game = new Game(canvas);
            }
            
            // 3. Sync Score (non-blocking)
            console.log("App: Syncing score...");
            // Use a Promise.race to ensure this doesn't hang the whole UI
            const scoreSyncPromise = Database.getUserScore(user);
            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(0), 4000));
            const cloudScore = await Promise.race([scoreSyncPromise, timeoutPromise]);
            
            if (cloudScore > game.highScore) {
                game.highScore = cloudScore;
            }

            // 4. Update UI Elements
            const userGreeting = document.getElementById('userGreeting');
            const userName = document.getElementById('userName');
            if (userGreeting && userName) {
                userName.innerText = (user.displayName || user.email?.split('@')[0] || 'PLAYER').toUpperCase();
                userGreeting.style.display = 'block';
            }

            game.resize();
            updateHomeMedal();
            
            // Final Transition
            console.log("App: Initialization finished successfully.");
            showUI('startScreen');
            clearTimeout(safetyTimeout);

            // Listeners
            setupAuthenticatedListeners();

        } catch (error) {
            console.error("App: Critical initialization error:", error);
            showUI('startScreen');
            clearTimeout(safetyTimeout);
        }
    });
    
    // Initial Resize
    window.addEventListener('resize', () => {
        if (game) game.resize();
    });

    // Debugging Tool: Allow manual score testing
    window.saveTestScore = (score) => {
        if (currentUser) {
            console.log("App: Saving test score:", score);
            Database.saveHighScore(currentUser, score);
        } else {
            console.warn("App: User not logged in!");
        }
    };
}

function setupAuthenticatedListeners() {
    // We use a flag to prevent multiple attachments
    if (window._listenersAttached) return;
    window._listenersAttached = true;

    if (startBtn) startBtn.addEventListener('click', startGame);
    if (enableCameraBtn) enableCameraBtn.addEventListener('click', enableCamera);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) retryBtn.addEventListener('click', resetGame);
}

// --- Game Screen Functions ---
function startGame() {
    if (!currentUser) {
        console.error("App: Cannot start game, user not logged in.");
        return;
    }
    if (game.gameRunning) return;
    
    // Resume audio context
    if (game.audioController) {
        game.audioController.ctx.resume();
    }
    
    game.start();
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
}

function resetGame() {
    if (!currentUser) return;
    updateHomeMedal(); // Update medals based on saved high score
    startGame();
}

async function handleLogout() {
    await Auth.logout();
}

// Update Home Screen Medal Display based on user's highest score
function updateHomeMedal() {
    if (!game || !currentUser) return;
    
    const highScore = game.highScore; 
    const homeRecord = document.getElementById('homeBestRecord');
    const homeScore = document.getElementById('homeBestScore');
    const homeMedalIcon = document.getElementById('homeBestMedalIcon');
    const homeMedalName = document.getElementById('homeBestMedalName');

    if (highScore >= 5) {
        homeRecord.style.display = 'block';
        homeScore.innerText = highScore;
        const medalInfo = getMedalInfo(highScore);
        if (medalInfo) {
            homeMedalIcon.src = medalInfo.src;
            homeMedalName.innerText = medalInfo.name + " MEDAL";
            homeMedalIcon.style.display = 'block';
        } else {
            homeMedalIcon.style.display = 'none';
            homeMedalName.innerText = "NO MEDAL YET";
        }
    } else if (highScore > 0) {
        homeRecord.style.display = 'block';
        homeScore.innerText = highScore;
        homeMedalIcon.style.display = 'none';
        homeMedalName.innerText = "NO MEDAL YET";
    } else {
        homeRecord.style.display = 'none';
    }
}


// --- Mediapipe Setup ---
let firstFrameDetected = false;
const outputCanvas = document.getElementById('output_canvas');
const outputCtx = outputCanvas.getContext('2d');

async function enableCamera() {
    if (!currentUser) return;

    // Resume audio context
    if (game && game.audioController) {
        game.audioController.ctx.resume();
    }
    
    enableCameraBtn.disabled = true;
    enableCameraBtn.innerHTML = 'Starting <div class="spinner camera-spinner"></div>';
    statusText.innerText = "Requesting Camera...";
    
    cameraBox.style.display = 'block';
    cameraLoader.style.display = 'flex';

    try {
        const hands = new Hands({locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }});

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1, // Restored to 1 for better landmark stability
            minDetectionConfidence: 0.7, // Increased for better accuracy
            minTrackingConfidence: 0.7   // Increased for better accuracy
        });

        hands.onResults(onResults);

        const videoElement = document.getElementById('input_video');
        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({image: videoElement});
            },
            width: 320,
            height: 240,
            facingMode: 'user'
        });

        await camera.start();
        console.log("App: Camera Initialized");
        statusText.innerText = "Processing AI...";
        
    } catch (err) {
        console.error("App: Camera Error:", err);
        statusText.innerText = "Error: Camera Blocked";
        statusText.style.color = "red";
        cameraLoader.innerHTML = "Camera<br>Blocked";
        enableCameraBtn.innerText = "Retry";
        enableCameraBtn.disabled = false;
    }
}

// State for smoothing and hysteresis
let pinchState = 'OPEN'; // 'OPEN' or 'PINCHED'
const PINCH_START_THRESHOLD = 0.06; // Strict start
const PINCH_RELEASE_THRESHOLD = 0.18; // Generous release (must open hand clearly)

// Smoothing variables
const smoothedLandmarks = [];
const SMOOTHING_FACTOR = 0.5; // Lower = more smooth, Higher = more responsive

function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

function onResults(results) {
    if (!firstFrameDetected) {
        firstFrameDetected = true;
        cameraLoader.style.display = 'none';
        enableCameraBtn.style.display = 'none';
        startBtn.style.display = 'block';
        gestureHint.style.display = 'block';
        document.getElementById('startInstruction').innerText = "Camera Active!";
        statusText.innerText = "Ready! Pinch to Fly";
        statusText.style.color = "#4ade80";
        isCameraReady = true;
    }

    outputCtx.save();
    outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
    outputCtx.drawImage(results.image, 0, 0, outputCanvas.width, outputCanvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const rawLandmarks = results.multiHandLandmarks[0];

        // --- 1. SMOOTHING LOGIC ---
        if (smoothedLandmarks.length === 0) {
            // Initialize
            for (let i = 0; i < rawLandmarks.length; i++) {
                smoothedLandmarks.push({ x: rawLandmarks[i].x, y: rawLandmarks[i].y, z: rawLandmarks[i].z });
            }
        } else {
            // Apply EMA
            for (let i = 0; i < rawLandmarks.length; i++) {
                smoothedLandmarks[i].x = lerp(smoothedLandmarks[i].x, rawLandmarks[i].x, SMOOTHING_FACTOR);
                smoothedLandmarks[i].y = lerp(smoothedLandmarks[i].y, rawLandmarks[i].y, SMOOTHING_FACTOR);
                smoothedLandmarks[i].z = lerp(smoothedLandmarks[i].z, rawLandmarks[i].z, SMOOTHING_FACTOR);
            }
        }

        const landmarks = smoothedLandmarks;

        // --- 2. ROBUST METRICS ---
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleMCP = landmarks[9]; // Middle finger base (more stable center)
        const wrist = landmarks[0];

        // Calculate Scale (Hand Size) using Wrist -> Middle MCP
        const handSize = Math.hypot(wrist.x - middleMCP.x, wrist.y - middleMCP.y);
        
        // Calculate Pinch Distance
        const rawDistance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        
        // Normalize
        const normalizedDistance = rawDistance / handSize;

        // --- 3. LOGIC & VISUALS ---
        let handColor = '#FFFFFF';
        
        if (pinchState === 'OPEN') {
            if (normalizedDistance < PINCH_START_THRESHOLD) {
                pinchState = 'PINCHED';
                handColor = '#00FF00'; // Green when pinched
                
                // Trigger Action
                const now = Date.now();
                if (now - lastActionTime > 150) { 
                    if (game && game.gameRunning) {
                        game.bird.flap();
                    } else if (isCameraReady && !game.gameRunning) {
                        if (now - lastStartTrigger > 1000) {
                            startGame();
                            lastStartTrigger = now;
                        }
                    }
                    lastActionTime = now;
                }
            }
        } else if (pinchState === 'PINCHED') {
            handColor = '#00FF00';
            if (normalizedDistance > PINCH_RELEASE_THRESHOLD) {
                pinchState = 'OPEN';
                handColor = '#FFFFFF';
            }
        }

        // Draw Hand
        drawConnectors(outputCtx, landmarks, HAND_CONNECTIONS, {color: handColor, lineWidth: 2});
        drawLandmarks(outputCtx, landmarks, {color: '#FF0000', lineWidth: 1, radius: 2});

        // --- 4. DEBUG VISUALS (PINCH METER) ---
        // Draw a bar on the left side to show pinch strength
        const barHeight = 100;
        const barWidth = 10;
        const barX = 10;
        const barY = outputCanvas.height - barHeight - 10;
        
        // Background
        outputCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
        outputCtx.fillRect(barX, barY, barWidth, barHeight);

        // Current Value (Inverted: Lower distance = Higher bar)
        // Max range approx 0.5?
        const fillPercent = Math.max(0, Math.min(1, 1 - (normalizedDistance * 2))); 
        outputCtx.fillStyle = pinchState === 'PINCHED' ? '#00FF00' : '#FFFF00';
        outputCtx.fillRect(barX, barY + (barHeight * (1 - fillPercent)), barWidth, barHeight * fillPercent);

        // Draw Threshold Lines
        // Start Threshold (High on bar)
        const startY = barY + (barHeight * (1 - (1 - PINCH_START_THRESHOLD * 2)));
        outputCtx.strokeStyle = "#00FF00";
        outputCtx.beginPath(); outputCtx.moveTo(barX, startY); outputCtx.lineTo(barX + 15, startY); outputCtx.stroke();

        // Release Threshold (Low on bar)
        const releaseY = barY + (barHeight * (1 - (1 - PINCH_RELEASE_THRESHOLD * 2)));
        outputCtx.strokeStyle = "#FFFFFF";
        outputCtx.beginPath(); outputCtx.moveTo(barX, releaseY); outputCtx.lineTo(barX + 15, releaseY); outputCtx.stroke();

    } else {
        pinchState = 'OPEN';
        // Reset smoothing if hand is lost for a while? 
        // For simplicity, we keep the array, it will snap to new pos on next frame, 
        // but let's clear it to avoid a "flying" hand effect if it reappears elsewhere.
        if (smoothedLandmarks.length > 0) smoothedLandmarks.length = 0;
    }
    outputCtx.restore();
}

// Start Initialization
init();
