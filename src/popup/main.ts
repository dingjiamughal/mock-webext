import {createApp} from 'vue';
import App from './Popup.vue';
import {setupApp} from '~/logic/common-setup';
import '../styles';
import 'uno.css';

const app = createApp(App);
setupApp(app);
app.mount('#app');
