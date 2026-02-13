import { Game } from './game.js';
import { Assets } from './assets.js';

// --- GLOBAL VARIABLES ---
let game;
let isCameraReady = false;
let isPinching = false;
let lastActionTime = 0;
let lastStartTrigger = 0;

// --- DOM ELEMENTS ---
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const enableCameraBtn = document.getElementById('enableCameraBtn');
const cameraBox = document.getElementById('cameraBox');
const cameraLoader = document.getElementById('cameraLoader');
const statusText = document.getElementById('statusText');
const gestureHint = document.getElementById('gestureHint');
const loadingOverlay = document.getElementById('loadingOverlay');

// --- INITIALIZATION ---
async function init() {
    try {
        await Assets.load();
        console.log("Assets loaded");
    } catch (e) {
        console.error("Asset load error", e);
    }

    const canvas = document.getElementById('gameCanvas');
    game = new Game(canvas);

    // Initial Resize
    game.resize();
    updateHomeMedal();

    // Event Listeners
    startBtn.addEventListener('click', startGame);
    enableCameraBtn.addEventListener('click', enableCamera);
    
    // Retry Button (in Game Over Screen)
    const retryBtn = gameOverScreen.querySelector('button');
    if (retryBtn) retryBtn.addEventListener('click', resetGame);

    // Hide loading overlay when scripts are ready (simulated for now as we don't have dynamic script loading here yet)
    // In a real module system, this script runs after everything is loaded.
    setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            startScreen.style.display = 'block';
        }, 500);
    }, 1000);
}

function startGame() {
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
    updateHomeMedal();
    startGame();
}

function updateHomeMedal() {
    if (!game) return;
    const highScore = game.highScore;
    const homeRecord = document.getElementById('homeBestRecord');
    const homeScore = document.getElementById('homeBestScore');
    const homeMedalIcon = document.getElementById('homeBestMedalIcon');
    const homeMedalName = document.getElementById('homeBestMedalName');

    if (highScore >= 5) {
        homeRecord.style.display = 'block';
        homeScore.innerText = highScore;
        const medalInfo = game.getMedalInfo(highScore);
        if (medalInfo) {
            homeMedalIcon.src = medalInfo.src;
            homeMedalName.innerText = medalInfo.name + " MEDAL";
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

// --- MEDIAPIPE SETUP ---
async function enableCamera() {
    // Resume audio context on user interaction
    if (game && game.audioController) {
        game.audioController.ctx.resume();
    }
    
    enableCameraBtn.disabled = true;
    enableCameraBtn.innerHTML = 'Starting <div class="spinner"></div>';
    statusText.innerText = "Requesting Camera...";
    
    cameraBox.style.display = 'block';
    cameraLoader.style.display = 'flex';

    try {
        const hands = new Hands({locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }});

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        hands.onResults(onResults);

        const videoElement = document.getElementById('input_video');
        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({image: videoElement});
            },
            width: 320,
            height: 240
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

let firstFrameDetected = false;
const outputCanvas = document.getElementById('output_canvas');
const outputCtx = outputCanvas.getContext('2d');

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
        const pinchThreshold = 0.05;

        if (distance < pinchThreshold) {
            outputCtx.beginPath();
            outputCtx.arc(indexTip.x * outputCanvas.width, indexTip.y * outputCanvas.height, 15, 0, 2 * Math.PI);
            outputCtx.fillStyle = "#00FF00";
            outputCtx.fill();

            if (!isPinching) {
                isPinching = true; 
                const now = Date.now();
                if (now - lastActionTime > 150) { 
                    if (game.gameRunning) {
                        game.bird.flap();
                        lastActionTime = now;
                    } else if (isCameraReady) {
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
