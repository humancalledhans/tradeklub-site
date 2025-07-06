import { createRouter, createWebHistory } from 'vue-router';
import LiveTv from '@/components/LiveTv.vue';
import LoginPage from '@/components/LoginPage.vue';
import RssWall from '@/components/RssWall.vue';
import AdminPanel from '@/components/AdminPanel.vue';

const routes = [
    { path: '/', redirect: '/live-tv' },
    { path: '/live-tv', name: 'LiveTv', component: LiveTv },
    { path: '/markets', name: 'Markets', component: RssWall },
    { path: '/admin-panel', name: 'Admin Login', component: AdminPanel },
    { path: '/login', name: 'Login', component: LoginPage, meta: { requiresGuest: true },
  },
    // Add other routes for additional tabs
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;