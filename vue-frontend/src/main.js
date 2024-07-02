import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
export const EventBus = createApp();
import  store  from './store/store'
import './assets/scss/_globals.scss'
const app = createApp(App)
app.use(router)
app.use(store)

app.config.globalProperties.$scss = {
    lightPrimaryColor: '#aeaeae',
    lightSecondaryColor: '#333',
    darkPrimaryColor: '#333',
    darkSecondaryColor: '#aeaeae',
};


app.mount('#app')

