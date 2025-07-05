<script setup lang="ts">
import {ref, computed, onMounted, watch} from 'vue';
import {ElMessage} from 'element-plus';
import {useWebExtensionStorage} from '~/composables/useWebExtensionStorage';
import {sendMessage} from 'webext-bridge/popup';
import MockGlobalControls from './components/MockGlobalControls.vue';
import MockRuleList from './components/MockRuleList.vue';
import MockRuleForm from './components/MockRuleForm.vue';

interface MockRule {
    id: string;
    url: string;
    method: string;
    matchType: 'contains' | 'exact' | 'regex';
    status: number;
    delay: number;
    response: any;
    enabled: boolean;
    collapsed?: boolean;
    originalRuleId?: string;
}

// 响应式数据
const {data: mockRules, dataReady: mockRulesReady} = useWebExtensionStorage<MockRule[]>('mockRules', [], {
    writeDefaults: true,
    mergeDefaults: false
});
const {data: isEnabled, dataReady: isEnabledReady} = useWebExtensionStorage('isEnabled', true, {flush: 'sync'});

const showForm = ref(false);
const editingRule = ref<MockRule | null>(null);

// 计算是否所有规则都已折叠
const allCollapsed = computed(() => {
    if (!mockRules.value || mockRules.value.length === 0) return false;
    return mockRules.value.every(rule => rule.collapsed);
});

// 计算展示的规则数量（启用的规则）
const enabledRulesCount = computed(() => {
    if (!mockRules.value) return 0;
    return mockRules.value.filter(rule => rule.enabled).length;
});
const combined = computed(() => ({
    isEnabled: isEnabled.value,
    mockRules: mockRules.value
}));

// 全局控制相关方法
function toggleGlobal(enabled: boolean) {
    isEnabled.value = enabled;
}

function addRule() {
    showForm.value = true;
    editingRule.value = null;
}

function exportRules() {
    const dataStr = JSON.stringify(mockRules.value, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mock-rules-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    ElMessage.success('规则已导出');
}

function importRules(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const importedRules = JSON.parse(e.target?.result as string);
            if (Array.isArray(importedRules)) {
                // 为导入的规则生成新的ID，避免冲突
                const newRules = importedRules.map(rule => ({
                    ...rule,
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    originalRuleId: rule.id
                }));
                mockRules.value!.push(...newRules);
                ElMessage.success(`成功导入 ${newRules.length} 条规则`);
            } else {
                ElMessage.error('导入文件格式错误');
            }
        } catch (error) {
            ElMessage.error('导入文件解析失败');
        }
    };
    reader.readAsText(file);
    // 清空input值，允许重复导入同一文件
    target.value = '';
}

// 工具函数：查找规则
const findRule = (id: string) => mockRules.value?.find(r => r.id === id);
const findRuleIndex = (id: string) => mockRules.value?.findIndex(r => r.id === id) ?? -1;

// 规则列表相关方法
function editRule(rule: MockRule) {
    showForm.value = true;
    editingRule.value = rule;
}

function deleteRule(id: string) {
    const index = findRuleIndex(id);
    if (index !== -1) {
        mockRules.value!.splice(index, 1);
        ElMessage.success('规则已删除');
    }
}

function toggleRuleCollapse(id: string) {
    const rule = findRule(id);
    if (rule) rule.collapsed = !rule.collapsed;
}

function toggleRuleEnabled(id: string, enabled: boolean) {
    const rule = findRule(id);
    if (rule) rule.enabled = enabled;
}

function toggleAllCollapse() {
    const shouldCollapse = !allCollapsed.value;
    mockRules.value!.forEach(rule => (rule.collapsed = shouldCollapse));
}

// 表单相关方法
function saveRule(ruleData: MockRule) {
    if (editingRule.value) {
        const index = mockRules.value!.findIndex(r => r.id === editingRule.value!.id);
        if (index !== -1) {
            mockRules.value![index] = ruleData;
        }
    } else {
        mockRules.value!.push(ruleData);
    }

    closeForm();
    ElMessage.success(editingRule.value ? '规则已更新' : '规则已添加');
}

function closeForm() {
    showForm.value = false;
    editingRule.value = null;
}

// 数据加载完成标志
const dataLoaded = ref(false);

// 广播数据更新的工具函数
const broadcastMockData = async (data = combined.value) => {
    try {
        await sendMessage(
            'broadcastMockDataUpdate',
            {
                mockRules: JSON.stringify(data.mockRules || []),
                isEnabled: data.isEnabled
            },
            'background'
        );
        console.log('[Sidepanel] Broadcasted mock data update:', data);
    } catch (error) {
        console.error('[Sidepanel] Failed to broadcast mock data update:', error);
    }
};

// 监听数据变化并广播更新
watch(
    () => combined.value,
    newValue => {
        if (dataLoaded.value) {
            Promise.resolve().then(() => broadcastMockData(newValue));
        }
    },
    {immediate: false, deep: true}
);

onMounted(async () => {
    try {
        // 等待数据加载完成
        await Promise.all([mockRulesReady, isEnabledReady]);
        console.log('[Sidepanel] Data loaded successfully:', {
            mockRules: mockRules.value,
            isEnabled: isEnabled.value
        });

        // 确保数据初始化
        if (!mockRules.value) mockRules.value = [];

        // 标记数据加载完成并广播初始数据
        dataLoaded.value = true;
        await broadcastMockData();
    } catch (error) {
        console.error('[Sidepanel] Failed to load data:', error);
        // 如果加载失败，使用默认值
        if (!mockRules.value) mockRules.value = [];
        dataLoaded.value = true;
    }
});
</script>

<template>
    <div class="sidepanel-container">
        <!-- 全局控制组件 -->
        <MockGlobalControls
            :is-enabled="isEnabled"
            :rules-count="mockRules?.length || 0"
            :enabled-rules-count="enabledRulesCount"
            :all-collapsed="allCollapsed"
            @toggle-global="toggleGlobal"
            @add-rule="addRule"
            @export-rules="exportRules"
            @import-rules="importRules"
            @toggle-all-collapse="toggleAllCollapse"
        />

        <!-- 规则表单组件 -->
        <MockRuleForm :visible="showForm" :editing-rule="editingRule" @save="saveRule" @close="closeForm" />

        <!-- 规则列表组件 -->
        <MockRuleList
            :rules="mockRules || []"
            :is-globally-disabled="!isEnabled"
            @edit-rule="editRule"
            @delete-rule="deleteRule"
            @toggle-rule-collapse="toggleRuleCollapse"
            @toggle-rule-enabled="toggleRuleEnabled"
        />
    </div>
</template>

<style scoped>
.sidepanel-container {
    padding: 20px;
    height: 100vh;
    overflow-y: auto;
}

/* 滚动条样式 */
.sidepanel-container::-webkit-scrollbar {
    width: 6px;
}

.sidepanel-container::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
}

.sidepanel-container::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
    transition: background 0.2s ease;
}

.sidepanel-container::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
}

/* 响应式设计 */
@media (max-width: 480px) {
    .sidepanel-container {
        padding: 12px;
    }
}
</style>
