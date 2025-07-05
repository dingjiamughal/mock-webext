import type {App} from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

export function setupApp(app: App) {
    // Inject a globally available `$app` object in template
    app.config.globalProperties.$app = {
        context: ''
    };

    // Provide access to `app` in script setup with `const app = inject('app')`
    app.provide('app', app.config.globalProperties.$app);

    // Install Element Plus
    app.use(ElementPlus);
    
    // Register Element Plus icons
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
        app.component(key, component);
    }

    // Here you can install additional plugins for all contexts: popup, options page and content-script.
    // example: app.use(i18n)
    // example excluding content-script context: if (context !== 'content-script') app.use(i18n)
}
