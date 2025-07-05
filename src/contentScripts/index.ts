/* eslint-disable no-console */
import {onMessage, sendMessage} from 'webext-bridge/content-script';

// Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
(() => {
    console.info('[vitesse-webext] Hello world from content script');

    // 监听来自sidepanel的实时数据更新
    onMessage('MOCK_DATA_UPDATED', ({data}) => {
        // 转发给inject脚本
        window.postMessage(
            {
                type: 'MOCK_DATA_UPDATED',
                data: data
            },
            '*'
        );
    });

    // 注入Mock脚本到页面
    function injectMockScript() {
        const script = document.createElement('script');
        script.src = browser.runtime.getURL('dist/inject/index.js');
        script.onload = () => {
            script.remove();
        };
        (document.head || document.documentElement).appendChild(script);
    }

    // 监听来自注入脚本的消息
    window.addEventListener('message', async event => {
        if (event.source !== window || !event.data.type) return;

        switch (event.data.type) {
            case 'GET_MOCK_RULES':
                try {
                    const response = await sendMessage('getMockRules', {}, 'background');
                    window.postMessage(
                        {
                            type: 'MOCK_RULES_RESPONSE',
                            data: response
                        },
                        '*'
                    );
                } catch (error) {
                    console.error('Failed to get mock rules:', error);
                    window.postMessage(
                        {
                            type: 'MOCK_RULES_RESPONSE',
                            data: {mockRules: [], isEnabled: false}
                        },
                        '*'
                    );
                }
                break;

            case 'MOCK_REQUEST':
                // 可以在这里添加请求日志记录等功能
                console.log('Mock request intercepted:', event.data.data);
                break;
        }
    });

    // 立即注入Mock脚本以拦截早期网络请求
    // 由于content script现在在document_start时运行，我们需要立即注入
    injectMockScript();
})();
