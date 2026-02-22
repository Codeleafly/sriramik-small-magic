import { Auth } from './services/auth.js';

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
const signupError = document.getElementById('signupError');
const emailSignupBtn = document.getElementById('emailSignupBtn');

async function init() {
    Auth.onAuthStateChanged((user) => {
        if (user) {
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
        
        const result = await Auth.loginWithEmail(email, password);
        if (!result.success) {
            loginError.innerText = result.message;
        }
    });

    googleLoginBtn.addEventListener('click', async () => {
        loginError.innerText = '';
        const result = await Auth.loginWithGoogle();
        if (!result.success) {
            loginError.innerText = result.message;
        }
    });

    // Signup logic
    emailSignupBtn.addEventListener('click', async () => {
        const email = signupEmail.value;
        const password = signupPassword.value;
        signupError.innerText = '';
        
        if (!email || !password) {
            signupError.innerText = 'Please enter credentials.';
            return;
        }

        if (password.length < 6) {
            signupError.innerText = 'Password too short (min 6).';
            return;
        }

        const result = await Auth.registerWithEmail(email, password);
        if (!result.success) {
            signupError.innerText = result.message;
        } else {
            signupError.innerText = 'Success! Check email for verification.';
        }
    });
}

init();
