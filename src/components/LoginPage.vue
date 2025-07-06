<template>
    <div class="login-page">
        <div class="login-container">
            <div class="login-form">
                <div class="logo-section">
                    <h1>Tradeklub Television</h1>
                    <p>Please login to access Live TV</p>
                </div>

                <!-- First time login prompt -->
                <div v-if="firstTimeLogin" class="first-time-login-prompt">
                    First time logging in? Check your email for a temporary password.
                </div>

                <!-- Login Form -->
                <form @submit.prevent="login" class="form">
                    <div class="input-group">
                        <input 
                            v-model="email" 
                            placeholder="Email" 
                            type="email" 
                            class="login-input"
                            required 
                        />
                    </div>
                    
                    <div class="input-group">
                        <input 
                            v-model="password" 
                            placeholder="Password" 
                            type="password" 
                            class="login-input"
                            @keyup.enter="login"
                            required 
                        />
                    </div>

                    <button type="submit" class="login-button" :disabled="isLoading">
                        {{ isLoading ? 'Logging in...' : 'Login' }}
                    </button>
                </form>

                <!-- Action Buttons -->
                <div class="action-buttons">
                    <button @click="register" class="register-button">
                        Register
                    </button>
                    <button @click="showResetModal = true" class="reset-password-button">
                        Reset Password
                    </button>
                </div>

                <!-- Error Message -->
                <div v-if="errorMessage" class="error-message">
                    {{ errorMessage }}
                </div>
            </div>
        </div>

        <!-- Reset Password Modal -->
        <div v-if="showResetModal" class="modal-overlay" @click="closeResetModal">
            <div class="modal-content" @click.stop>
                <h3>Reset Password</h3>
                <form @submit.prevent="resetPassword">
                    <input 
                        v-model="emailForReset" 
                        placeholder="Enter your email address" 
                        type="email"
                        class="login-input" 
                        required
                    />
                    <div class="modal-buttons">
                        <button type="submit" class="reset-password-submit" :disabled="isResetting">
                            {{ isResetting ? 'Sending...' : 'Send Reset Email' }}
                        </button>
                        <button type="button" @click="closeResetModal" class="modal-close">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script>
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

export default {
    name: "LoginPage",
    data() {
        return {
            email: "",
            password: "",
            emailForReset: "",
            firstTimeLogin: true,
            showResetModal: false,
            isLoading: false,
            isResetting: false,
            errorMessage: ""
        };
    },
    methods: {
        async login() {
            if (this.isLoading) return;
            
            this.isLoading = true;
            this.errorMessage = "";
            
            const auth = getAuth();
            try {
                const userCredential = await signInWithEmailAndPassword(auth, this.email, this.password);
                const user = userCredential.user;
                
                // Store user in session
                sessionStorage.setItem('user', JSON.stringify(user));
                
                // Get redirect URL or default to live TV page
                const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '/live-tv';
                sessionStorage.removeItem('redirectAfterLogin');
                
                // Redirect to the intended page
                this.$router.push(redirectUrl);
                
            } catch (error) {
                console.error("Login Error:", error.message);
                this.errorMessage = this.getErrorMessage(error.code);
            } finally {
                this.isLoading = false;
            }
        },

        async register() {
            const courseUrl = "https://www.tradelikethepros.com/offers/H9Vzg92f";
            window.location.href = courseUrl;
        },

        async resetPassword() {
            if (this.isResetting) return;
            
            if (!this.emailForReset.trim()) {
                this.errorMessage = "Please enter your email address to reset your password.";
                return;
            }

            this.isResetting = true;
            this.errorMessage = "";
            
            const auth = getAuth();
            try {
                await sendPasswordResetEmail(auth, this.emailForReset);
                alert("Password reset email sent! Please check your inbox.");
                this.closeResetModal();
            } catch (error) {
                console.error("Password reset error", error);
                this.errorMessage = this.getErrorMessage(error.code);
            } finally {
                this.isResetting = false;
            }
        },

        closeResetModal() {
            this.showResetModal = false;
            this.emailForReset = "";
            this.errorMessage = "";
        },

        getErrorMessage(errorCode) {
            switch (errorCode) {
                case 'auth/user-not-found':
                    return 'No account found with this email address.';
                case 'auth/wrong-password':
                    return 'Incorrect password. Please try again.';
                case 'auth/invalid-email':
                    return 'Please enter a valid email address.';
                case 'auth/user-disabled':
                    return 'This account has been disabled.';
                case 'auth/too-many-requests':
                    return 'Too many failed attempts. Please try again later.';
                default:
                    return 'Login failed. Please check your credentials and try again.';
            }
        }
    },

    mounted() {
        // Check if user is already logged in
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            // User is already logged in, redirect to intended page
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '/live-tv';
            sessionStorage.removeItem('redirectAfterLogin');
            this.$router.push(redirectUrl);
        }
    }
};
</script>

<style scoped>
.login-page {
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #001845 0%, #162D5D 100%);
    padding: 20px;
}

.login-container {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    max-width: 400px;
    width: 100%;
}

.login-form {
    padding: 40px;
}

.logo-section {
    text-align: center;
    margin-bottom: 30px;
}

.logo-section h1 {
    color: #001845;
    margin: 0 0 10px 0;
    font-size: 28px;
    font-weight: bold;
}

.logo-section p {
    color: #666;
    margin: 0;
    font-size: 16px;
}

.first-time-login-prompt {
    background-color: #fff3cd;
    border: 1px solid #ffeaa7;
    color: #856404;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 20px;
    font-size: 14px;
    text-align: center;
}

.form {
    margin-bottom: 20px;
}

.input-group {
    margin-bottom: 16px;
}

.login-input {
    width: 100%;
    padding: 14px 16px;
    border: 2px solid #e1e5e9;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.3s ease;
    box-sizing: border-box;
}

.login-input:focus {
    outline: none;
    border-color: #001845;
}

.login-button {
    width: 100%;
    padding: 14px;
    background-color: #001845;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: background-color 0.3s ease;
    margin-bottom: 20px;
}

.login-button:hover:not(:disabled) {
    background-color: #162D5D;
}

.login-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
}

.action-buttons {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.register-button,
.reset-password-button {
    width: 100%;
    padding: 12px;
    border: 2px solid #001845;
    background-color: transparent;
    color: #001845;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease;
}

.register-button:hover,
.reset-password-button:hover {
    background-color: #001845;
    color: white;
}

.error-message {
    background-color: #f8d7da;
    color: #721c24;
    padding: 12px;
    border-radius: 6px;
    margin-top: 15px;
    font-size: 14px;
    text-align: center;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    width: 90%;
}

.modal-content h3 {
    margin: 0 0 20px 0;
    color: #001845;
    text-align: center;
}

.modal-buttons {
    display: flex;
    gap: 10px;
    margin-top: 20px;
}

.reset-password-submit,
.modal-close {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease;
}

.reset-password-submit {
    background-color: #001845;
    color: white;
}

.reset-password-submit:hover:not(:disabled) {
    background-color: #162D5D;
}

.reset-password-submit:disabled {
    background-color: #ccc;
    cursor: not-allowed;
}

.modal-close {
    background-color: #e0e0e0;
    color: #333;
}

.modal-close:hover {
    background-color: #bdbdbd;
}

/* Mobile responsiveness */
@media (max-width: 480px) {
    .login-form {
        padding: 30px 20px;
    }
    
    .logo-section h1 {
        font-size: 24px;
    }
    
    .modal-buttons {
        flex-direction: column;
    }
}
</style>