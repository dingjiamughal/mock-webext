import {defineConfig} from 'vite';
import {sharedConfig} from './vite.config.mjs';
import {isDev, r} from './scripts/utils';
import packageJson from './package.json';

// bundling the inject script using Vite
export default defineConfig({
    ...sharedConfig,
    define: {
        __DEV__: isDev,
        __NAME__: JSON.stringify(packageJson.name),
        // https://github.com/vitejs/vite/issues/9320
        // https://github.com/vitejs/vite/issues/9186
        'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production')
    },
    build: {
        watch: isDev ? {} : undefined,
        outDir: r('extension/dist/inject'),
        cssCodeSplit: false,
        emptyOutDir: false,
        sourcemap: isDev ? 'inline' : false,
        lib: {
            entry: r('src/inject/index.ts'),
            name: `${packageJson.name}-inject`,
            formats: ['iife']
        },
        rollupOptions: {
            output: {
                entryFileNames: 'index.js',
                extend: true
            }
        }
    }
});
