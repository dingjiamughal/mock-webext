<script setup lang="ts">
import {ArrowDown, ArrowUp, Plus} from '@element-plus/icons-vue';
import {ref} from 'vue';

interface Props {
    isEnabled: boolean;
    rulesCount: number;
    enabledRulesCount: number;
    allCollapsed?: boolean;
}

interface Emits {
    (e: 'toggle-global', enabled: boolean): void;
    (e: 'add-rule'): void;
    (e: 'export-rules'): void;
    (e: 'import-rules', event: Event): void;
    (e: 'toggle-all-collapse'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const fileInputRef = ref<HTMLInputElement>();

// 切换全局开关
function toggleGlobal(enabled: boolean) {
    emit('toggle-global', enabled);
}

// 添加规则
function addRule() {
    emit('add-rule');
}

// 导出规则
function exportRules() {
    emit('export-rules');
}

// 触发文件选择
function triggerImport() {
    fileInputRef.value?.click();
}

// 导入规则
function importRules(event: Event) {
    emit('import-rules', event);
}

// 切换全部折叠/展开
function toggleAllCollapse() {
    emit('toggle-all-collapse');
}
</script>

<template>
    <div class="global-controls">
        <!-- 全局状态卡片 -->
        <el-card class="status-card" shadow="never">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="status-indicator" :class="{active: isEnabled}">
                        <div class="status-dot"></div>
                    </div>
                    <el-space>
                        <span class="text-lg font-semibold"> Mock{{ isEnabled ? '已启用' : '已禁用' }} </span>
                        <span class="text-sm text-gray-500">
                            共{{ rulesCount }}条规则，展示{{ enabledRulesCount }}条
                        </span>
                    </el-space>
                </div>
                <el-switch :model-value="isEnabled" @update:model-value="toggleGlobal" />
            </div>
        </el-card>

        <!-- 操作按钮组 -->
        <div class="action-buttons">
            <el-button type="primary" size="default" @click="addRule">
                <el-icon><Plus /></el-icon>
                添加规则
            </el-button>

            <el-space>
                <el-button type="text" @click="exportRules" :disabled="rulesCount === 0"> 导出 </el-button>
                <el-button type="text" @click="triggerImport"> 导入 </el-button>
                <el-button
                    type="text"
                    @click="toggleAllCollapse"
                    :disabled="rulesCount === 0"
                    :title="allCollapsed ? '全部展开' : '全部折叠'"
                >
                    <el-icon>
                        <ArrowDown v-if="allCollapsed" />
                        <ArrowUp v-else />
                    </el-icon>
                </el-button>
            </el-space>
        </div>

        <!-- 隐藏的文件输入 -->
        <input ref="fileInputRef" type="file" accept=".json" style="display: none" @change="importRules" />
    </div>
</template>

<style scoped>
.global-controls {
    margin-bottom: 24px;
}

.status-card {
    margin-bottom: 16px;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
}

.status-card :deep(.el-card__body) {
    padding: 20px;
}

.status-indicator {
    position: relative;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #f56c6c;
    transition: all 0.3s ease;
}

.status-indicator.active {
    background: #67c23a;
}

.status-dot {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: white;
    animation: pulse 2s infinite;
}

.status-indicator.active .status-dot {
    animation: pulse-active 2s infinite;
}

@keyframes pulse {
    0% {
        box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.7);
    }
    70% {
        box-shadow: 0 0 0 10px rgba(245, 108, 108, 0);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(245, 108, 108, 0);
    }
}

@keyframes pulse-active {
    0% {
        box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.7);
    }
    70% {
        box-shadow: 0 0 0 10px rgba(103, 194, 58, 0);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(103, 194, 58, 0);
    }
}

.action-buttons {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}
</style>
