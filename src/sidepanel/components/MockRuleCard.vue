<script setup lang="ts">
import {ArrowDown, ArrowUp} from '@element-plus/icons-vue';

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
    rule: MockRule;
    isGloballyDisabled: boolean;
}

interface Emits {
    (e: 'edit', rule: MockRule): void;
    (e: 'delete', ruleId: string): void;
    (e: 'toggle-collapse', ruleId: string): void;
    (e: 'toggle-enabled', ruleId: string, enabled: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 获取HTTP方法对应的标签类型
function getMethodTagType(method: string) {
    const typeMap: Record<string, string> = {
        GET: 'success',
        POST: 'primary',
        PUT: 'warning',
        DELETE: 'danger',
        PATCH: 'info',
        ALL: ''
    };
    return typeMap[method] || '';
}

// 获取状态码对应的标签类型
function getStatusTagType(status: number) {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400) return 'danger';
    return 'warning';
}

// 获取匹配类型的中文显示
function getMatchTypeText(matchType: string) {
    const textMap: Record<string, string> = {
        contains: '包含',
        exact: '精确',
        regex: '正则'
    };
    return textMap[matchType] || matchType;
}

// 格式化响应数据显示
function formatResponseData(response: any) {
    return typeof response === 'string' ? response : JSON.stringify(response, null, 4);
}

// 切换折叠状态
function toggleCollapse() {
    emit('toggle-collapse', props.rule.id);
}

// 编辑规则
function editRule() {
    emit('edit', props.rule);
}

// 删除规则
function deleteRule() {
    if (confirm('确定要删除这个规则吗？')) {
        emit('delete', props.rule.id);
    }
}

// 切换启用状态
function toggleEnabled(enabled: boolean) {
    emit('toggle-enabled', props.rule.id, enabled);
}
</script>

<template>
    <el-card
        class="rule-card"
        shadow="hover"
        :class="[{'opacity-50': !rule.enabled}, {'globally-disabled': isGloballyDisabled}]"
    >
        <template #header>
            <div class="flex items-start justify-between gap-2">
                <div class="flex items-start gap-2 min-w-0">
                    <el-tag :type="getMethodTagType(rule.method)" size="small" class="flex-shrink-0">
                        {{ rule.method }}
                    </el-tag>
                    <span class="font-medium text-sm break-all leading-relaxed">{{ rule.url }}</span>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <el-button type="text" size="small" @click="toggleCollapse" class="p-1">
                        <el-icon>
                            <ArrowDown v-if="rule.collapsed" />
                            <ArrowUp v-else />
                        </el-icon>
                    </el-button>
                </div>
            </div>
            <!-- 基本信息 -->
            <div class="flex flex-wrap items-center justify-between">
                <el-space>
                    <el-tag size="small" type="info"> 匹配：{{ getMatchTypeText(rule.matchType) }} </el-tag>
                    <el-tag :type="getStatusTagType(rule.status)" size="small"> 状态码：{{ rule.status }} </el-tag>
                    <el-tag size="small" :type="rule.delay > 0 ? 'warning' : 'success'">
                        延迟：{{ rule.delay }}ms
                    </el-tag>
                </el-space>
                <!-- 操作按钮 -->
                <el-space class="flex items-center justify-end">
                    <el-button type="primary" size="small" @click="editRule"> 编辑 </el-button>
                    <el-button type="danger" size="small" @click="deleteRule"> 删除 </el-button>
                    <el-switch
                        size="small"
                        :model-value="rule.enabled"
                        @update:model-value="toggleEnabled"
                        :disabled="isGloballyDisabled"
                    />
                </el-space>
            </div>
        </template>

        <transition name="card-content" appear>
            <div v-show="!rule.collapsed" class="space-y-2">
                <!-- 响应数据预览 -->
                <div class="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <pre class="font-mono max-h-[160px] overflow-y-auto whitespace-pre-wrap break-words">{{
                        formatResponseData(rule.response)
                    }}</pre>
                </div>
            </div>
        </transition>
    </el-card>
</template>

<style scoped>
.card-content-enter-active,
.card-content-leave-active {
    transition: all 0.3s ease;
    overflow: hidden;
}

.card-content-enter-from,
.card-content-leave-to {
    opacity: 0;
    max-height: 0;
    transform: translateY(-10px);
}

.card-content-enter-to,
.card-content-leave-from {
    opacity: 1;
    max-height: 500px;
    transform: translateY(0);
}

.rule-card {
    transition: box-shadow 0.2s ease;
    margin: 2px 0;
}

.rule-card:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.globally-disabled {
    opacity: 0.6;
    filter: grayscale(0.3);
    pointer-events: none;
}

.globally-disabled:hover {
    transform: none;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
</style>
