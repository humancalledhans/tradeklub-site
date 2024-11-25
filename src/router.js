import { createRouter, createWebHistory } from 'vue-router';
import LiveTv from '@/components/LiveTv.vue';
import RssWall from '@/components/RssWall.vue';

const routes = [
    { path: '/', redirect: '/markets' },
    { path: '/live-tv', name: 'LiveTv', component: LiveTv },
    { path: '/markets', name: 'Markets', component: RssWall },
    // Add other routes for additional tabs
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;