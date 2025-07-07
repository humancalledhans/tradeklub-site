import { createRouter, createWebHistory } from 'vue-router';
import LiveTv from '@/components/LiveTv.vue';
import LoginPage from '@/components/LoginPage.vue';
import RssWall from '@/components/RssWall.vue';
import AdminPanel from '@/components/AdminPanel.vue';

const routes = [
  { path: '/', redirect: '/live-tv' },
  {
    path: '/live-tv',
    name: 'LiveTv',
    component: LiveTv,
    meta: { requiresPreview: true } // 10-second preview + redirect to login
  },
  {
    path: '/markets',
    name: 'Markets',
    component: RssWall
    // No meta - freely accessible
  },
  {
    path: '/admin-panel',
    name: 'Admin Login',
    component: AdminPanel
    // No meta - freely accessible
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: { requiresGuest: true } // Redirect if already logged in
  },
  // Add other routes for additional tabs as needed
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Helper function to check if user is authenticated
function checkAuthentication() {
  const storedUser = sessionStorage.getItem('user')
  const urlParams = new URLSearchParams(window.location.search)
  const authParam = urlParams.get('auth')

  // User is authenticated if they have a stored session OR the special auth URL parameter
  return storedUser || (authParam === '23901:kwpDFLQWK9102882913')
}

// Navigation guard - runs before each route change
router.beforeEach((to, from, next) => {
  const isAuthenticated = checkAuthentication()

  // If going to login page and already authenticated, redirect to live-tv
  if (to.meta.requiresGuest && isAuthenticated) {
    next('/live-tv')
    return
  }

  // For live-tv page with preview requirement - let it load
  // The LiveTv component itself handles the 10-second timer and redirect logic
  if (to.meta.requiresPreview) {
    next() // Allow access, component handles preview timer
    return
  }

  // All other routes (/markets, /admin-panel, etc.) are freely accessible
  next()
})

export default router;