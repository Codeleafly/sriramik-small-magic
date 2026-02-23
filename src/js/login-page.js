import { Auth } from './services/auth.js';
import { Database } from './services/db.js';
import { clearAllCookies } from './utils/storage-cleaner.js';

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
        const photoURL = signupPhoto.value;
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

        const result = await Auth.registerWithEmail(email, password, name);
        
        if (result.success) {
            Auth.setLoginSession();
            // Save initial profile data to RTDB (URL or null)
            await Database.saveUserProfile(result.user, name, photoURL);
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
