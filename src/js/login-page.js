import { Auth } from './services/auth.js';
import { Database } from './services/db.js';
import { clearAllCookies } from './utils/storage-cleaner.js';

// Helper to convert file to base64 with downscaling
function imageToLowResBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 128; // Keep it small for RTDB performance
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compressed JPEG
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');

const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const emailLoginBtn = document.getElementById('emailLoginBtn');
const googleLoginBtn = document.getElementById('googleLoginBtn');

const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupName = document.getElementById('signupName');
const signupPhoto = document.getElementById('signupPhoto');
const signupError = document.getElementById('signupError');
const emailSignupBtn = document.getElementById('emailSignupBtn');

let isProcessingAuth = false;

async function init() {
    clearAllCookies();
    Auth.onAuthStateChanged((user) => {
        if (user && !isProcessingAuth) {
            window.location.href = 'index.html';
        }
    });

    // Toggle between Login and Signup
    showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // Login logic
    emailLoginBtn.addEventListener('click', async () => {
        const email = loginEmail.value;
        const password = loginPassword.value;
        loginError.innerText = '';
        
        if (!email || !password) {
            loginError.innerText = 'Please enter credentials.';
            return;
        }
        
        isProcessingAuth = true;
        const result = await Auth.loginWithEmail(email, password);
        if (!result.success) {
            loginError.innerText = result.message;
            isProcessingAuth = false;
        } else {
            Auth.setLoginSession();
            window.location.href = 'index.html';
        }
    });

    googleLoginBtn.addEventListener('click', async () => {
        loginError.innerText = '';
        isProcessingAuth = true;
        const result = await Auth.loginWithGoogle();
        if (result.success) {
            Auth.setLoginSession();
            // Save/Update profile from Google automatically
            await Database.saveUserProfile(result.user, result.user.displayName, result.user.photoURL);
            window.location.href = 'index.html';
        } else {
            loginError.innerText = result.message;
            isProcessingAuth = false;
        }
    });

    // Signup logic
    emailSignupBtn.addEventListener('click', async () => {
        const name = signupName.value;
        const email = signupEmail.value;
        const password = signupPassword.value;
        const photo = signupPhoto.files[0];
        signupError.innerText = '';
        
        if (!name || !email || !password) {
            signupError.innerText = 'Please enter all fields.';
            return;
        }

        if (password.length < 6) {
            signupError.innerText = 'Password too short (min 6).';
            return;
        }

        isProcessingAuth = true;
        emailSignupBtn.innerText = "CREATING...";
        emailSignupBtn.disabled = true;

        // Photo processing (Downscaled)
        let photoBase64 = null;
        if (photo) {
            try {
                photoBase64 = await imageToLowResBase64(photo);
            } catch (err) {
                console.error("Photo process error:", err);
            }
        }

        const result = await Auth.registerWithEmail(email, password, name);
        
        if (result.success) {
            Auth.setLoginSession();
            // Save initial profile data to RTDB (Base64 or null)
            await Database.saveUserProfile(result.user, name, photoBase64);
            signupError.innerText = 'Success! Redirecting...';
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            signupError.innerText = result.message;
            isProcessingAuth = false;
            emailSignupBtn.innerText = "CREATE ACCOUNT";
            emailSignupBtn.disabled = false;
        }
    });
}

init();
