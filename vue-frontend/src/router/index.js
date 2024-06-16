import { createRouter, createWebHistory } from 'vue-router';
import LoginComponent from '../components/LoginComponent.vue';
import SignUpComponent from '../components/SignUpComponent.vue';
import HeaderComponent from '../components/HeaderCmp.vue';
import MapComponent from '../components/MapComponent.vue';
const routes = [
    { path: '/login', component: LoginComponent },
    { path: '/signup', component: SignUpComponent },
    { path: '/header', component: HeaderComponent, name: 'Header' },
    { path: '/map', MapComponent, name: 'MapComponent' },
    //{ path: '/', redirect: '/map' }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;
