<script setup lang="ts">
import draggable from 'vuedraggable';
import MockRuleCard from './MockRuleCard.vue';

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

interface Props {
    rules: MockRule[];
    isGloballyDisabled: boolean;
}

interface Emits {
    (e: 'edit-rule', rule: MockRule): void;
    (e: 'delete-rule', ruleId: string): void;
    (e: 'toggle-rule-collapse', ruleId: string): void;
    (e: 'toggle-rule-enabled', ruleId: string, enabled: boolean): void;
    (e: 'reorder-rules', newOrder: MockRule[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 编辑规则
function editRule(rule: MockRule) {
    emit('edit-rule', rule);
}

// 删除规则
function deleteRule(ruleId: string) {
    emit('delete-rule', ruleId);
}

// 切换规则折叠状态
function toggleRuleCollapse(ruleId: string) {
    emit('toggle-rule-collapse', ruleId);
}

// 切换规则启用状态
function toggleRuleEnabled(ruleId: string, enabled: boolean) {
    emit('toggle-rule-enabled', ruleId, enabled);
}

// 处理拖拽排序
function handleReorder(newOrder: MockRule[]) {
    emit('reorder-rules', newOrder);
}
</script>

<template>
    <div class="rule-list">
        <!-- 规则列表 -->
        <div v-if="rules.length > 0">
            <draggable
                :list="rules"
                item-key="id"
                handle=".drag-handle"
                ghost-class="ghost"
                chosen-class="chosen"
                drag-class="drag"
                animation="200"
                @end="handleReorder"
            >
                <template #item="{element: rule}">
                    <div class="rule-item space-y-3">
                        <!-- 拖拽手柄 -->
                        <div class="drag-handle" title="拖拽排序">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <circle cx="4" cy="4" r="1.5" />
                                <circle cx="12" cy="4" r="1.5" />
                                <circle cx="4" cy="8" r="1.5" />
                                <circle cx="12" cy="8" r="1.5" />
                                <circle cx="4" cy="12" r="1.5" />
                                <circle cx="12" cy="12" r="1.5" />
                            </svg>
                        </div>

                        <div class="rule-card-wrapper">
                            <MockRuleCard
                                :rule="rule"
                                :is-globally-disabled="isGloballyDisabled"
                                @edit="editRule"
                                @delete="deleteRule"
                                @toggle-collapse="toggleRuleCollapse"
                                @toggle-enabled="toggleRuleEnabled"
                            />
                        </div>
                    </div>
                </template>
            </draggable>
        </div>

        <!-- 空状态 -->
        <div v-else class="text-center py-12">
            <div class="text-gray-400 text-lg mb-2">📝</div>
            <div class="text-gray-500 text-sm mb-4">还没有添加任何Mock规则</div>
            <div class="text-gray-400 text-xs">点击上方的"添加规则"按钮开始创建你的第一个Mock规则</div>
        </div>
    </div>
</template>

<style scoped>
.rule-list {
    min-height: 200px;
}

.rule-item {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    transition: all 0.2s ease;
    border-radius: 8px;
    padding: 4px;
    margin-bottom: 12px;
}

.rule-item:hover {
    background-color: rgba(0, 0, 0, 0.02);
}

.drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: #c0c4cc;
    cursor: grab;
    border-radius: 4px;
    transition: all 0.2s ease;
    margin-top: 12px;
    flex-shrink: 0;
}

.drag-handle:hover {
    color: #909399;
    background-color: rgba(0, 0, 0, 0.05);
}

.drag-handle:active {
    cursor: grabbing;
    color: #606266;
}

.rule-card-wrapper {
    flex: 1;
    min-width: 0;
}

/* vuedraggable 样式 */
.ghost {
    opacity: 0.5;
    background: rgba(64, 158, 255, 0.1);
    border: 2px dashed #409eff;
}

.chosen {
    transform: rotate(2deg);
}

.drag {
    opacity: 0.8;
    transform: scale(1.05);
}
</style>
