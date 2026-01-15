import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import Login from '../views/Login.vue';
import { auth } from '../firebase';

const routes = [
  { path: '/', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/login', component: Login }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Guard: Redirect unauthenticated users to Login
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const currentUser = auth.currentUser;

  if (requiresAuth && !currentUser) {
    next('/login');
  } else if (requiresAuth && currentUser && !currentUser.emailVerified) {
    // Optional: You could redirect to a specific "Please Verify" page instead
    alert("Please verify your email before logging in.");
    next('/login');
  } else {
    next();
  }
});

export default router;