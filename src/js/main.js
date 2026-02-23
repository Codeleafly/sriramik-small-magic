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
            modelComplexity: 0, // 0 for maximum speed/low latency
            minDetectionConfidence: 0.4, // Slightly lower for faster detection
            minTrackingConfidence: 0.4
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
        const landmarks = results.multiHandLandmarks[0];
        drawConnectors(outputCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
        drawLandmarks(outputCtx, landmarks, {color: '#FF0000', lineWidth: 1, radius: 2});

        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];
        const distance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        const pinchThreshold = 0.12; // Much more sensitive for faster detection

        if (distance < pinchThreshold) {
            outputCtx.beginPath();
            outputCtx.arc(indexTip.x * outputCanvas.width, indexTip.y * outputCanvas.height, 15, 0, 2 * Math.PI);
            outputCtx.fillStyle = "#00FF00";
            outputCtx.fill();

            if (!isPinching) {
                isPinching = true; 
                const now = Date.now();
                if (now - lastActionTime > 40) { // Minimum debounce for instant response
                    if (game && game.gameRunning) {
                        game.bird.flap();
                        lastActionTime = now;
                    } else if (isCameraReady && !game.gameRunning) {
                        if (now - lastStartTrigger > 1000) {
                            startGame();
                            lastStartTrigger = now;
                        }
                    }
                }
            }
        } else {
            isPinching = false;
        }
    } else {
        isPinching = false;
    }
    outputCtx.restore();
}

// Start Initialization
init();
