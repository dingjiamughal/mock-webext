<script setup lang="ts">
import {Search} from '@element-plus/icons-vue';
import {ElMessage} from 'element-plus';
import {computed, onMounted, ref, watch} from 'vue';
import {sendMessage} from 'webext-bridge/popup';
import {useWebExtensionStorage} from '~/composables/useWebExtensionStorage';
import MockGlobalControls from './components/MockGlobalControls.vue';
import MockRuleForm from './components/MockRuleForm.vue';
import MockRuleList from './components/MockRuleList.vue';

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

// 搜索和分页相关状态
const searchQuery = ref<string>('');
const currentPage = ref<number>(1);
const pageSize = ref<number>(10);
const pageSizeOptions: number[] = [10, 30, 50];

// 计算是否所有规则都已折叠
const allCollapsed = computed(() => {
    if (!mockRules.value || mockRules.value.length === 0) return false;
    return mockRules.value.every(rule => rule.collapsed);
});

// 过滤后的规则（根据搜索条件）
const filteredRules = computed(() => {
    if (!mockRules.value) return [];
    if (!searchQuery.value.trim()) return mockRules.value;

    const query = searchQuery.value.toLowerCase().trim();
    return mockRules.value.filter(rule => rule.url.toLowerCase().includes(query));
});

// 分页后的规则
const paginatedRules = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return filteredRules.value.slice(start, end);
});

// 总页数
const totalPages = computed(() => {
    return Math.ceil(filteredRules.value.length / pageSize.value);
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

// 搜索和分页相关方法
function handleSearch() {
    currentPage.value = 1; // 搜索时重置到第一页
}

function handlePageChange(page: number) {
    currentPage.value = page;
}

function handlePageSizeChange(size: number) {
    pageSize.value = size;
    currentPage.value = 1; // 改变页面大小时重置到第一页
}

function clearSearch() {
    searchQuery.value = '';
    currentPage.value = 1;
}

// 重新排序规则
function reorderRules(newOrder: MockRule[]) {
    // 如果有搜索或分页，需要特殊处理
    if (searchQuery.value || currentPage.value > 1) {
        // 获取当前页面规则在原数组中的索引
        const startIndex = (currentPage.value - 1) * pageSize.value;
        const originalRules = [...(mockRules.value || [])];

        // 更新当前页面的规则顺序
        const filteredIndices: number[] = [];
        filteredRules.value.forEach((rule: MockRule, index: number) => {
            const originalIndex = originalRules.findIndex((r: MockRule) => r.id === rule.id);
            if (originalIndex !== -1) {
                filteredIndices.push(originalIndex);
            }
        });

        // 替换对应位置的规则
        newOrder.forEach((rule, index) => {
            const targetIndex = filteredIndices[startIndex + index];
            if (targetIndex !== undefined && targetIndex !== -1) {
                originalRules[targetIndex] = rule;
            }
        });

        mockRules.value = originalRules;
    } else {
        // 没有搜索和分页时，直接更新
        mockRules.value = newOrder;
    }

    // 显示成功提示
    ElMessage.success('规则顺序已更新');
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

        <!-- 搜索和分页控件 -->
        <div v-if="mockRules && mockRules.length > 0" class="search-pagination-container">
            <!-- 搜索框 -->
            <div class="search-container">
                <el-input
                    v-model="searchQuery"
                    placeholder="按 URL 搜索规则..."
                    clearable
                    :prefix-icon="Search"
                    @input="handleSearch"
                    @clear="clearSearch"
                    class="search-input"
                />
            </div>

            <!-- 分页信息和页面大小选择 -->
            <div class="pagination-info">
                <div class="page-size-selector">
                    <span class="page-size-label">每页显示：</span>
                    <el-select v-model="pageSize" @change="handlePageSizeChange" size="small" style="width: 80px">
                        <el-option v-for="size in pageSizeOptions" :key="size" :label="size" :value="size" />
                    </el-select>
                    <span class="page-size-label">条</span>
                </div>
                <div class="results-info">
                    <span class="text-sm text-gray-600">
                        共 {{ filteredRules.length }} 条结果
                        <span v-if="searchQuery">(已过滤)</span>
                    </span>
                </div>
            </div>
        </div>

        <!-- 规则列表组件 -->
        <MockRuleList
            :rules="paginatedRules"
            :is-globally-disabled="!isEnabled"
            @edit-rule="editRule"
            @delete-rule="deleteRule"
            @toggle-rule-collapse="toggleRuleCollapse"
            @toggle-rule-enabled="toggleRuleEnabled"
            @reorder-rules="reorderRules"
        />

        <!-- 分页组件 -->
        <div v-if="totalPages > 1" class="pagination-container">
            <el-pagination
                v-model:current-page="currentPage"
                :page-size="pageSize"
                :total="filteredRules.length"
                layout="total, prev, pager, next, jumper"
                @current-change="handlePageChange"
                :prev-text="'上一页'"
                :next-text="'下一页'"
                small
            />
        </div>
    </div>
</template>

<style scoped>
.sidepanel-container {
    padding: 20px;
}

/* 搜索和分页样式 */
.search-pagination-container {
    margin: 16px 0;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e9ecef;
}

.search-container {
    margin-bottom: 12px;
}

.search-input {
    width: 100%;
}

.pagination-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
}

.page-size-selector {
    display: flex;
    align-items: center;
    gap: 8px;
}

.page-size-label {
    font-size: 14px;
    color: #666;
    white-space: nowrap;
}

.results-info {
    font-size: 14px;
    color: #666;
}

.pagination-container {
    display: flex;
    justify-content: center;
    margin-top: 20px;
    padding: 16px 0;
}

/* 响应式设计 */
@media (max-width: 480px) {
    .sidepanel-container {
        padding: 12px;
    }

    .search-pagination-container {
        padding: 12px;
        margin: 12px 0;
    }

    .pagination-info {
        flex-direction: column;
        align-items: flex-start;
    }

    .page-size-selector {
        order: 2;
    }

    .results-info {
        order: 1;
        margin-bottom: 8px;
    }
}
</style>
