<script setup lang="ts">
import {storageDemo} from '~/logic/storage';
import {useWebExtensionStorage} from '~/composables/useWebExtensionStorage';

// 浮动面板显示配置
const {data: showContentPanel} = useWebExtensionStorage('showContentPanel', false, {flush: 'sync'});

function openOptionsPage() {
    browser.runtime.openOptionsPage();
}
</script>

<template>
    <main class="w-[300px] px-4 py-5 text-center text-gray-700">
        <Logo />
        <div>Popup</div>
        <SharedSubtitle />

        <!-- 浮动面板显示配置 -->
        <div class="mt-4 p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center justify-between">
                <span class="text-sm font-medium">显示浮动面板</span>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input v-model="showContentPanel" type="checkbox" class="sr-only peer" />
                    <div
                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
                    ></div>
                </label>
            </div>
            <p class="text-xs text-gray-500 mt-1">控制页面右下角浮动面板的显示</p>
        </div>

        <button class="btn mt-4" @click="openOptionsPage">Open Options</button>
        <div class="mt-2"><span class="opacity-50">Storage:</span> {{ storageDemo }}</div>
    </main>
</template>
