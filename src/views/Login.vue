<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const email = ref('');
const password = ref('');
const isRegister = ref(false);
const error = ref('');
const infoMessage = ref('');
const loading = ref(false);
const needsVerification = ref(false); // New state

const router = useRouter();
const { login, register, resendVerification } = useAuth();

const handleSubmit = async () => {
  error.value = '';
  infoMessage.value = '';
  loading.value = true;
  
  try {
    if (isRegister.value) {
      // REGISTER FLOW
      await register(email.value, password.value);
      needsVerification.value = true; // Show verification UI immediately
    } else {
      // LOGIN FLOW
      const credential = await login(email.value, password.value);
      
      // Check if verified
      if (credential.user.emailVerified) {
        router.push('/');
      } else {
        needsVerification.value = true; // Stop! Show verification UI
      }
    }
  } catch (e) {
    // Make firebase errors readable
    error.value = e.message.replace('Firebase: ', '').replace('auth/', '');
  } finally {
    loading.value = false;
  }
};

const handleResend = async () => {
  try {
    await resendVerification();
    infoMessage.value = "Verification email sent! Check your spam folder.";
  } catch (e) {
    error.value = "Too many requests. Please wait a moment.";
  }
};

// Reset to normal login if they clicked the wrong thing
const backToLogin = () => {
  needsVerification.value = false;
  isRegister.value = false;
  error.value = '';
  infoMessage.value = '';
};
</script>

<template>
  <div class="login-container">
    <div class="auth-card">
      <div class="logo-area">
        <h1>🌲 Forest Tracker</h1>
      </div>
      
      <div v-if="needsVerification" class="verification-state">
        <div class="icon">✉️</div>
        <h2>Verify your Email</h2>
        <p>
          We've sent a confirmation link to <strong>{{ email }}</strong>.
          <br>Please click it to access the dashboard.
        </p>

        <div v-if="infoMessage" class="success-msg">{{ infoMessage }}</div>
        <div v-if="error" class="error-msg">{{ error }}</div>

        <button class="primary-btn" @click="handleResend" :disabled="loading">
          Resend Verification Email
        </button>
        
        <button class="text-btn" @click="backToLogin">
          Back to Login
        </button>
      </div>

      <form v-else @submit.prevent="handleSubmit">
        <h2>{{ isRegister ? 'Create Account' : 'Sign In' }}</h2>
        
        <div class="input-group">
          <label>Email</label>
          <input type="email" v-model="email" required placeholder="name@pfpi.net" />
        </div>
        
        <div class="input-group">
          <label>Password</label>
          <input type="password" v-model="password" required placeholder="••••••" />
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <button type="submit" class="primary-btn" :disabled="loading">
          {{ loading ? 'Please wait...' : (isRegister ? 'Sign Up' : 'Login') }}
        </button>

        <p class="toggle-text">
          {{ isRegister ? 'Already have an account?' : 'Need an account?' }}
          <a href="#" @click.prevent="isRegister = !isRegister">
            {{ isRegister ? 'Login' : 'Register' }}
          </a>
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f3f4f6;
  padding: 20px;
}

.auth-card {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.logo-area h1 { color: #059669; margin: 0 0 20px 0; font-size: 1.5rem; }

h2 { margin-bottom: 20px; color: #1f2937; }

.input-group { margin-bottom: 15px; text-align: left; }
.input-group label { display: block; font-size: 0.875rem; color: #4b5563; margin-bottom: 5px; }
.input-group input { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; }

.primary-btn {
  width: 100%;
  padding: 10px;
  background-color: #059669;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
}
.primary-btn:hover { background-color: #047857; }
.primary-btn:disabled { opacity: 0.7; cursor: not-allowed; }

.text-btn { background: none; border: none; color: #666; cursor: pointer; margin-top: 15px; text-decoration: underline; }

.error-msg { color: #dc2626; font-size: 0.875rem; margin-bottom: 10px; }
.success-msg { color: #059669; font-size: 0.875rem; margin-bottom: 10px; background: #ecfdf5; padding: 8px; border-radius: 4px; }

.toggle-text { margin-top: 20px; font-size: 0.875rem; color: #6b7280; }
.toggle-text a { color: #059669; font-weight: 600; text-decoration: none; }

/* Verification State Styles */
.verification-state .icon { font-size: 3rem; margin-bottom: 10px; }
.verification-state p { color: #4b5563; margin-bottom: 20px; line-height: 1.5; }
</style>