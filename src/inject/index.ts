// 引入MockJS
import Mock from 'mockjs';

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

interface MockData {
    mockRules: MockRule[];
    isEnabled: boolean;
}

// 全局变量
let mockData: MockData = {
    mockRules: [],
    isEnabled: false
};

// 原始的fetch和XMLHttpRequest
const originalFetch = window.fetch;

// 获取Mock规则
function getMockRules(): Promise<MockData> {
    return new Promise(resolve => {
        // 发送消息给content script
        window.postMessage({type: 'GET_MOCK_RULES'}, '*');

        // 监听响应
        const handleResponse = (event: MessageEvent) => {
            if (event.source === window && event.data.type === 'MOCK_RULES_RESPONSE') {
                window.removeEventListener('message', handleResponse);

                // 验证数据结构
                const data = event.data.data;
                console.log('[Mock] Received data from background:', data);

                if (data && typeof data === 'object') {
                    // 现在background直接返回数组，不需要解析字符串
                    let parsedMockRules = [];
                    if (Array.isArray(data.mockRules)) {
                        parsedMockRules = data.mockRules;
                        console.log('[Mock] Using array mockRules directly:', parsedMockRules);
                    } else if (typeof data.mockRules === 'string') {
                        // 兼容旧格式，以防万一
                        try {
                            parsedMockRules = JSON.parse(data.mockRules);
                            console.log('[Mock] Parsed mockRules from string:', parsedMockRules);
                        } catch (error) {
                            console.warn('[Mock] Failed to parse mockRules string:', error);
                            parsedMockRules = [];
                        }
                    } else {
                        console.warn('[Mock] Unexpected mockRules format:', typeof data.mockRules, data.mockRules);
                    }

                    const result = {
                        mockRules: parsedMockRules,
                        isEnabled: Boolean(data.isEnabled)
                    };
                    console.log('[Mock] Resolving with data:', result);
                    resolve(result);
                } else {
                    console.warn('[Mock] Invalid data received:', data);
                    resolve({mockRules: [], isEnabled: false});
                }
            }
        };

        window.addEventListener('message', handleResponse);

        // 超时处理
        setTimeout(() => {
            window.removeEventListener('message', handleResponse);
            console.warn('[Mock] Timeout getting mock rules');
            resolve({mockRules: [], isEnabled: false});
        }, 1000);
    });
}

// 匹配URL的函数
function matchUrl(url: string, pattern: string, matchType: 'contains' | 'exact' | 'regex'): boolean {
    try {
        switch (matchType) {
            case 'exact':
                return url === pattern;
            case 'contains':
                return url.includes(pattern);
            case 'regex':
                const regex = new RegExp(pattern);
                return regex.test(url);
            default:
                return false;
        }
    } catch (error) {
        console.error('URL matching error:', error);
        return false;
    }
}

// 查找匹配的Mock规则
function findMatchingRule(url: string, method: string): MockRule | null {
    console.log(`[Mock] Checking for rules - URL: ${url}, Method: ${method}`);
    console.log(`[Mock] Current mockData:`, mockData);

    // 如果Mock功能未启用，直接返回null
    if (!mockData.isEnabled) {
        console.log(`[Mock] Mock is disabled globally`);
        return null;
    }

    // 确保mockRules是数组
    if (!mockData.mockRules || !Array.isArray(mockData.mockRules)) {
        console.log(`[Mock] No valid mockRules array:`, mockData.mockRules);
        return null;
    }

    console.log(`[Mock] Found ${mockData.mockRules.length} rules to check`);

    // 如果还在初始化中且没有规则，记录日志但不阻止拦截
    if (!isInitialized && mockData.mockRules.length === 0) {
        console.log(`[Mock] Still initializing, no rules available yet for ${method} ${url}`);
        return null;
    }

    const matchingRule =
        mockData.mockRules.find(rule => {
            console.log(`[Mock] Checking rule:`, rule);

            if (!rule.enabled) {
                console.log(`[Mock] Rule disabled: ${rule.id}`);
                return false;
            }

            // 检查HTTP方法
            if (rule.method !== 'ALL' && rule.method.toLowerCase() !== method.toLowerCase()) {
                console.log(`[Mock] Method mismatch - Rule: ${rule.method}, Request: ${method}`);
                return false;
            }

            // 检查URL匹配
            const urlMatches = matchUrl(url, rule.url, rule.matchType);
            console.log(`[Mock] URL match result for rule ${rule.id}: ${urlMatches}`);
            return urlMatches;
        }) || null;

    if (matchingRule) {
        console.log(`[Mock] Found matching rule:`, matchingRule);
    } else {
        console.log(`[Mock] No matching rule found for ${method} ${url}`);
    }

    return matchingRule;
}

// 创建Mock响应
function createMockResponse(rule: MockRule): Promise<Response> {
    return new Promise(resolve => {
        const delay = rule.delay || 0;

        setTimeout(() => {
            let responseBody: string;
            let contentType = 'application/json';
            let processedResponse = rule.response;

            // 如果响应数据包含MockJS语法，使用Mock.mock生成数据
            try {
                if (typeof rule.response === 'string') {
                    // 尝试解析为JSON
                    const parsedResponse = JSON.parse(rule.response);
                    // 使用MockJS生成数据
                    processedResponse = Mock.mock(parsedResponse);
                } else if (typeof rule.response === 'object') {
                    // 直接使用MockJS生成数据
                    processedResponse = Mock.mock(rule.response);
                }
            } catch (error) {
                // 如果解析失败或MockJS处理失败，使用原始数据
                console.warn('[Mock] Failed to process MockJS template:', error);
                processedResponse = rule.response;
            }

            if (typeof processedResponse === 'object') {
                responseBody = JSON.stringify(processedResponse);
            } else if (typeof processedResponse === 'string') {
                responseBody = processedResponse;
                // 尝试解析为JSON来确定content-type
                try {
                    JSON.parse(processedResponse);
                } catch {
                    contentType = 'text/plain';
                }
            } else {
                responseBody = String(processedResponse);
                contentType = 'text/plain';
            }

            const response = new Response(responseBody, {
                status: rule.status,
                statusText: getStatusText(rule.status),
                headers: {
                    'Content-Type': contentType,
                    'X-Mock-Rule': rule.id
                }
            });

            resolve(response);
        }, delay);
    });
}

// 获取状态码对应的状态文本
function getStatusText(status: number): string {
    const statusTexts: {[key: number]: string} = {
        200: 'OK',
        201: 'Created',
        204: 'No Content',
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        500: 'Internal Server Error',
        502: 'Bad Gateway',
        503: 'Service Unavailable'
    };
    return statusTexts[status] || 'Unknown';
}

// 拦截fetch请求
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || 'GET';

    // 查找匹配的规则
    const matchingRule = findMatchingRule(url, method);

    if (matchingRule) {
        console.log(`[Mock] Intercepted ${method} ${url} with rule:`, matchingRule);

        // 发送消息通知content script
        window.postMessage(
            {
                type: 'MOCK_REQUEST',
                data: {
                    url,
                    method,
                    rule: matchingRule
                }
            },
            '*'
        );

        return createMockResponse(matchingRule);
    }

    // 如果没有匹配的规则，使用原始fetch
    return originalFetch.call(this, input, init);
};

// 拦截XMLHttpRequest - 使用原型方法修改确保兼容性
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    user?: string | null,
    password?: string | null
): void {
    // 存储请求信息
    (this as any)._url = typeof url === 'string' ? url : url.href;
    (this as any)._method = method ? method.toUpperCase() : 'GET';

    return originalXHROpen.apply(this, arguments as any);
};

XMLHttpRequest.prototype.send = function (data?: Document | XMLHttpRequestBodyInit | null): void {
    const method = (this as any)._method || 'GET';
    const url = (this as any)._url;

    if (!url) {
        return originalXHRSend.apply(this, arguments as any);
    }

    const matchingRule = findMatchingRule(url, method);

    if (matchingRule) {
        console.log(`[Mock] Intercepted XMLHttpRequest ${method} ${url} with rule:`, matchingRule);

        // 发送消息通知content script
        window.postMessage(
            {
                type: 'MOCK_REQUEST',
                data: {
                    url,
                    method,
                    rule: matchingRule
                }
            },
            '*'
        );

        const xhr = this;

        // 模拟异步响应
        setTimeout(() => {
            // 处理MockJS数据生成
            let processedResponse = matchingRule.response;
            try {
                if (typeof matchingRule.response === 'string') {
                    // 尝试解析为JSON
                    const parsedResponse = JSON.parse(matchingRule.response);
                    // 使用MockJS生成数据
                    processedResponse = Mock.mock(parsedResponse);
                } else if (typeof matchingRule.response === 'object') {
                    // 直接使用MockJS生成数据
                    processedResponse = Mock.mock(matchingRule.response);
                }
            } catch (error) {
                // 如果解析失败或MockJS处理失败，使用原始数据
                console.warn('[Mock] Failed to process MockJS template:', error);
                processedResponse = matchingRule.response;
            }

            // 设置响应内容
            let responseText: string;
            if (typeof processedResponse === 'object') {
                responseText = JSON.stringify(processedResponse);
            } else {
                responseText = String(processedResponse);
            }

            // 设置响应头方法
            const mockHeaders = {
                'Content-Type': typeof processedResponse === 'object' ? 'application/json' : 'text/plain',
                'X-Mock-Rule': matchingRule.id
            };

            xhr.getResponseHeader = function (name: string) {
                return mockHeaders[name as keyof typeof mockHeaders] || null;
            };

            xhr.getAllResponseHeaders = function () {
                return Object.entries(mockHeaders)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\r\n');
            };

            // 模拟完整的readyState变化过程
            const simulateReadyStateChange = (readyState: number) => {
                Object.defineProperty(xhr, 'readyState', {value: readyState, writable: false, configurable: true});

                // 触发readystatechange事件
                if (xhr.onreadystatechange) {
                    xhr.onreadystatechange.call(xhr, new Event('readystatechange'));
                }

                // 触发addEventListener绑定的事件
                const event = new Event('readystatechange');
                Object.defineProperty(event, 'target', {value: xhr, writable: false});
                xhr.dispatchEvent(event);
            };

            // 1. OPENED (1)
            simulateReadyStateChange(1);

            // 2. HEADERS_RECEIVED (2)
            setTimeout(() => {
                simulateReadyStateChange(2);

                // 3. LOADING (3)
                setTimeout(() => {
                    simulateReadyStateChange(3);

                    // 4. DONE (4) - 设置最终响应数据
                    setTimeout(() => {
                        // 重新定义响应属性
                        Object.defineProperty(xhr, 'status', {
                            value: matchingRule.status || 200,
                            writable: false,
                            configurable: true
                        });
                        Object.defineProperty(xhr, 'statusText', {
                            value: getStatusText(matchingRule.status || 200),
                            writable: false,
                            configurable: true
                        });
                        Object.defineProperty(xhr, 'response', {
                            value: responseText,
                            writable: false,
                            configurable: true
                        });
                        Object.defineProperty(xhr, 'responseText', {
                            value: responseText,
                            writable: false,
                            configurable: true
                        });

                        simulateReadyStateChange(4);

                        // 触发load事件
                        if (xhr.onload) {
                            xhr.onload.call(xhr, new ProgressEvent('load'));
                        }

                        // 触发addEventListener绑定的load事件
                        const loadEvent = new ProgressEvent('load');
                        Object.defineProperty(loadEvent, 'target', {value: xhr, writable: false});
                        xhr.dispatchEvent(loadEvent);

                        // 触发loadend事件
                        if (xhr.onloadend) {
                            xhr.onloadend.call(xhr, new ProgressEvent('loadend'));
                        }

                        const loadendEvent = new ProgressEvent('loadend');
                        Object.defineProperty(loadendEvent, 'target', {value: xhr, writable: false});
                        xhr.dispatchEvent(loadendEvent);
                    }, 10);
                }, 10);
            }, 10);
        }, matchingRule.delay || 0);

        return;
    }

    // 如果没有匹配的规则，调用原始方法
    return originalXHRSend.apply(this, arguments as any);
};

// 监听实时数据更新
window.addEventListener('message', event => {
    if (event.source === window && event.data.type === 'MOCK_DATA_UPDATED') {
        const newData = event.data.data;
        console.log('[Mock] Received real-time update:', newData);

        if (newData && typeof newData === 'object') {
            // 现在数据应该直接是数组格式
            let parsedMockRules = [];
            if (Array.isArray(newData.mockRules)) {
                parsedMockRules = newData.mockRules;
                console.log('[Mock] Using array mockRules from real-time update:', parsedMockRules);
            } else if (typeof newData.mockRules === 'string') {
                // 兼容旧格式
                try {
                    parsedMockRules = JSON.parse(newData.mockRules);
                    console.log('[Mock] Parsed mockRules from string in real-time update:', parsedMockRules);
                } catch (error) {
                    console.warn('[Mock] Failed to parse mockRules string in real-time update:', error);
                    parsedMockRules = [];
                }
            } else {
                console.warn(
                    '[Mock] Unexpected mockRules format in real-time update:',
                    typeof newData.mockRules,
                    newData.mockRules
                );
            }

            mockData = {
                mockRules: parsedMockRules,
                isEnabled: Boolean(newData.isEnabled)
            };
            console.log('[Mock] Data updated in real-time:', mockData);
        }
    }
});

// 立即开始拦截，异步加载Mock数据
// 这样可以确保即使在document_start阶段也能拦截到早期请求
console.log('[Mock] Starting request interception immediately');

// 异步初始化Mock数据
(async () => {
    try {
        const initialData = await getMockRules();
        mockData = {
            mockRules: Array.isArray(initialData.mockRules) ? initialData.mockRules : [],
            isEnabled: Boolean(initialData.isEnabled)
        };
        console.log('[Mock] Initialized with rules:', mockData);
    } catch (error) {
        console.error('[Mock] Failed to initialize:', error);
        mockData = {mockRules: [], isEnabled: false};
    }

    // 保留定期更新作为备用机制（间隔延长）
    setInterval(async () => {
        try {
            const newData = await getMockRules();
            if (newData && Array.isArray(newData.mockRules)) {
                mockData = {
                    mockRules: newData.mockRules,
                    isEnabled: Boolean(newData.isEnabled)
                };
            } else {
                console.warn('[Mock] Invalid data received during update, keeping current data');
            }
        } catch (error) {
            console.error('[Mock] Failed to update rules:', error);
        }
    }, 30000); // 改为每30秒更新一次作为备用
})();

// 添加一个标志来跟踪初始化状态
let isInitialized = false;
setTimeout(() => {
    isInitialized = true;
    console.log('[Mock] Initialization timeout reached, proceeding with current data');
}, 100); // 给100ms的初始化时间

console.log('[Mock] Inject script loaded successfully');
