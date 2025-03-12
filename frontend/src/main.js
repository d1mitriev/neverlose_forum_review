import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/css/tailwind.css'

import DialogModal from './components/DialogModal.vue'

const app = createApp(App)

app.use(router)

app.component('DialogModal', DialogModal)

app.mount('#app') 