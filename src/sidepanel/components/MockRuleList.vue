<script setup lang="ts">
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
</script>

<template>
    <div class="rule-list">
        <!-- 规则列表 -->
        <div v-if="rules.length > 0" class="space-y-3">
            <MockRuleCard
                v-for="rule in rules"
                :key="rule.id"
                :rule="rule"
                :is-globally-disabled="isGloballyDisabled"
                @edit="editRule"
                @delete="deleteRule"
                @toggle-collapse="toggleRuleCollapse"
                @toggle-enabled="toggleRuleEnabled"
            />
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
</style>
