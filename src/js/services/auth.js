import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged,
    sendEmailVerification,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth, googleProvider } from "../firebase-config.js";

export const Auth = {
    user: null,

    registerWithEmail: async (email, password, displayName) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            await updateProfile(user, {
                displayName: displayName
            });

            await sendEmailVerification(user);
            return { success: true, user: user, message: "Verification email sent!" };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    loginWithEmail: async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            if (!userCredential.user.emailVerified) {
                return { success: true, user: userCredential.user, warning: "Email not verified." };
            }
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    loginWithGoogle: async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    logout: async () => {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    onAuthStateChanged: (callback) => {
        onAuthStateChanged(auth, (user) => {
            Auth.user = user;
            callback(user);
        });
    }
};
