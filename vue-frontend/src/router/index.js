import { createRouter, createWebHistory } from 'vue-router';
import LoginComponent from '../components/LoginComponent.vue';
import SignUpComponent from '../components/SignUpComponent.vue';


const routes = [
    { path: '/login', component: LoginComponent },
    { path: '/signup', component: SignUpComponent },
    //{ path: '/', redirect: '/map' }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;
