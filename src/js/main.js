import { Game } from './game.js';
import { Assets } from './assets.js';
import { Auth } from './services/auth.js';
import { Database } from './services/db.js';

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

// --- INITIALIZATION ---
async function init() {
    // Safety Timeout: Hide loading overlay if it takes too long (10 seconds)
    const safetyTimeout = setTimeout(() => {
        if (loadingOverlay && loadingOverlay.style.display !== 'none') {
            console.warn("Loading taking too long, forcing overlay hide.");
            loadingOverlay.style.opacity = '0';
            setTimeout(() => loadingOverlay.style.display = 'none', 500);
        }
    }, 10000);

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW Registered'))
                .catch(err => console.log('SW Registration Failed', err));
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
                console.log(`User response to install prompt: ${outcome}`);
                deferredPrompt = null;
                installBtn.style.display = 'none';
            }
        });
    }

    // Initialize Auth State Listener FIRST
    Auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        
        try {
            if (user) {
                // User is logged in
                console.log("User logged in:", user.email);
                
                // Show install button if prompt is available
                if (deferredPrompt && installBtn) installBtn.style.display = 'block';

                // Load Game Assets and Game Instance
                await Assets.load();
                
                if (!game) {
                    const canvas = document.getElementById('gameCanvas');
                    game = new Game(canvas);
                }
                
                game.resize();
                updateHomeMedal();
                
                // Show Start Screen
                startScreen.style.display = 'block';
                
                // Hide overlay
                loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    if (loadingOverlay) loadingOverlay.style.display = 'none';
                    clearTimeout(safetyTimeout);
                }, 500);

                // Add listeners ONLY ONCE
                setupAuthenticatedListeners();

            } else {
                // User is logged out, redirect to login page
                console.log("User logged out, redirecting...");
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error("Initialization error:", error);
            // Hide overlay even on error so user isn't stuck
            if (loadingOverlay) loadingOverlay.style.display = 'none';
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
            console.log("Saving test score:", score);
            Database.saveHighScore(currentUser, score);
        } else {
            console.warn("User not logged in!");
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
        console.error("Cannot start game, user not logged in.");
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

    // Update individual medal counts
    for (const [medal, count] of Object.entries(game.medalCounts)) {
        const el = document.getElementById(`count-${medal}`);
        if (el) el.innerText = count;
    }

    if (highScore >= 5) {
        homeRecord.style.display = 'block';
        homeScore.innerText = highScore;
        const medalInfo = game.getMedalInfo(highScore);
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
        console.log("Camera Initialized");
        statusText.innerText = "Processing AI...";
        
    } catch (err) {
        console.error(err);
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
