import {onMessage, sendMessage} from 'webext-bridge/background';
import type {Tabs} from 'webextension-polyfill';

// Mock功能相关的类型定义
interface MockRule {
    id: string;
    url: string;
    method: string;
    matchType: 'contains' | 'exact' | 'regex';
    status: number;
    delay: number;
    response: any;
    enabled: boolean;
}

// only on dev mode
if (import.meta.hot) {
    // @ts-expect-error for background HMR
    import('/@vite/client');
    // load latest content script
    import('./contentScriptHMR');
}

// remove or turn this off if you don't use side panel
const USE_SIDE_PANEL = true;

// to toggle the sidepanel with the action button in chromium:
if (USE_SIDE_PANEL) {
    // @ts-expect-error missing types
    browser.sidePanel.setPanelBehavior({openPanelOnActionClick: true}).catch((error: unknown) => console.error(error));
}

browser.runtime.onInstalled.addListener((): void => {
    // eslint-disable-next-line no-console
    console.log('Extension installed');
});

let previousTabId = 0;

// communication example: send previous tab title from background page
// see shim.d.ts for type declaration
browser.tabs.onActivated.addListener(async ({tabId}) => {
    if (!previousTabId) {
        previousTabId = tabId;
        return;
    }

    let tab: Tabs.Tab;

    try {
        tab = await browser.tabs.get(previousTabId);
        previousTabId = tabId;
    } catch {
        return;
    }

    // eslint-disable-next-line no-console
    console.log('previous tab', tab);
    sendMessage('tab-prev', {title: tab.title}, {context: 'content-script', tabId});
});

onMessage('get-current-tab', async () => {
    try {
        const tab = await browser.tabs.get(previousTabId);
        return {
            title: tab?.title
        };
    } catch {
        return {
            title: undefined
        };
    }
});

// Mock功能的消息处理
onMessage('getMockRules', async () => {
    try {
        const result = await browser.storage.local.get(['mockRules', 'isEnabled']);
        console.log('[Background] Raw storage data:', result);

        // 确保mockRules是数组格式
        let mockRules = result.mockRules || [];
        if (typeof mockRules === 'string') {
            try {
                mockRules = JSON.parse(mockRules);
            } catch (parseError) {
                console.error('[Background] Failed to parse stored mockRules:', parseError);
                mockRules = [];
            }
        }

        // 确保是数组
        if (!Array.isArray(mockRules)) {
            console.warn('[Background] mockRules is not an array, resetting to empty array');
            mockRules = [];
        }

        const responseData = {
            mockRules: mockRules, // 直接返回数组，不再字符串化
            isEnabled: result.isEnabled !== false // 默认启用
        };

        console.log('[Background] Returning mock data:', responseData);
        return responseData;
    } catch (error) {
        console.error('Failed to get mock rules:', error);
        return {
            mockRules: [],
            isEnabled: false
        };
    }
});

onMessage('saveMockRule', async ({data}) => {
    try {
        const {rule} = data as unknown as {rule: MockRule};
        const result = await browser.storage.local.get('mockRules');
        const mockRules: MockRule[] = (result.mockRules as MockRule[]) || [];

        const existingIndex = mockRules.findIndex(r => r.id === rule.id);
        if (existingIndex !== -1) {
            mockRules[existingIndex] = rule;
        } else {
            mockRules.push(rule);
        }

        await browser.storage.local.set({mockRules});
        return {success: true};
    } catch (error) {
        console.error('Failed to save mock rule:', error);
        return {success: false, error: (error as Error).message};
    }
});

onMessage('deleteMockRule', async ({data}) => {
    try {
        const {ruleId} = data as unknown as {ruleId: string};
        const result = await browser.storage.local.get('mockRules');
        const mockRules: MockRule[] = (result.mockRules as MockRule[]) || [];

        const filteredRules = mockRules.filter(r => r.id !== ruleId);
        await browser.storage.local.set({mockRules: filteredRules});
        return {success: true};
    } catch (error) {
        console.error('Failed to delete mock rule:', error);
        return {success: false, error: (error as Error).message};
    }
});

onMessage('toggleMockEnabled', async ({data}) => {
    try {
        const {enabled} = data as unknown as {enabled: boolean};
        await browser.storage.local.set({isEnabled: enabled});
        return {success: true};
    } catch (error) {
        console.error('Failed to toggle mock enabled:', error);
        return {success: false, error: (error as Error).message};
    }
});

onMessage('exportMockRules', async () => {
    try {
        const result = await browser.storage.local.get('mockRules');
        return {
            success: true,
            data: result.mockRules || []
        };
    } catch (error) {
        console.error('Failed to export mock rules:', error);
        return {
            success: false,
            error: (error as Error).message
        };
    }
});

onMessage('importMockRules', async ({data}) => {
    try {
        const {rules, replaceExisting} = data as unknown as {rules: MockRule[]; replaceExisting: boolean};

        if (replaceExisting) {
            await browser.storage.local.set({mockRules: rules});
        } else {
            const result = await browser.storage.local.get('mockRules');
            const existingRules: MockRule[] = (result.mockRules as MockRule[]) || [];
            const mergedRules = [...existingRules];

            rules.forEach((newRule: MockRule) => {
                const existingIndex = mergedRules.findIndex(r => r.id === newRule.id);
                if (existingIndex !== -1) {
                    mergedRules[existingIndex] = newRule;
                } else {
                    mergedRules.push(newRule);
                }
            });

            await browser.storage.local.set({mockRules: mergedRules});
        }

        return {success: true};
    } catch (error) {
        console.error('Failed to import mock rules:', error);
        return {success: false, error: (error as Error).message};
    }
});

// 广播Mock数据更新到所有content scripts
onMessage('broadcastMockDataUpdate', async ({data}) => {
    try {
        const tabs = await browser.tabs.query({});

        // 向所有标签页的content script发送更新消息
        const promises = tabs.map(tab => {
            if (tab.id) {
                return sendMessage('MOCK_DATA_UPDATED', data, {
                    context: 'content-script',
                    tabId: tab.id
                }).catch(() => {
                    // 忽略无法发送消息的标签页（如chrome://页面）
                });
            }
        });

        await Promise.all(promises);
        console.log('[Background] Mock data update broadcasted to all tabs');

        return {success: true};
    } catch (error) {
        console.error('[Background] Failed to broadcast mock data update:', error);
        return {success: false, error: (error as Error).message};
    }
});
