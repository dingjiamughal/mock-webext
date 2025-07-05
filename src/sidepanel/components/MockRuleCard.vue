<script setup lang="ts">
import {ref, computed} from 'vue';
import {ArrowDown, ArrowUp, View} from '@element-plus/icons-vue';
import {ElMessageBox} from 'element-plus';
import Mock from 'mockjs';

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

// 控制详情弹窗显示
const showDetailDialog = ref(false);

// 获取HTTP方法对应的标签类型
function getMethodTagType(method: string): 'success' | 'primary' | 'warning' | 'danger' | 'info' {
    const methodMap: Record<string, 'success' | 'primary' | 'warning' | 'danger' | 'info'> = {
        GET: 'success',
        POST: 'primary',
        PUT: 'warning',
        DELETE: 'danger',
        PATCH: 'info'
    };
    return methodMap[method] || 'info';
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
    ElMessageBox.confirm('确定要删除这个规则吗？', '删除确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
    })
        .then(() => {
            emit('delete', props.rule.id);
        })
        .catch(() => {
            // 用户取消删除
        });
}

// 显示详情弹窗
function showDetail() {
    showDetailDialog.value = true;
}

// 解析 MockJS 内容
const parsedMockData = computed(() => {
    try {
        if (typeof props.rule.response === 'string') {
            // 尝试解析 JSON 字符串
            const parsed = JSON.parse(props.rule.response);
            // 使用 MockJS 生成示例数据
            const mockResult = Mock.mock(parsed);
            return {
                template: JSON.stringify(parsed, null, 2),
                example: JSON.stringify(mockResult, null, 2),
                hasMockSyntax: JSON.stringify(parsed).includes('@')
            };
        } else {
            // 直接使用对象
            const mockResult = Mock.mock(props.rule.response);
            return {
                template: JSON.stringify(props.rule.response, null, 2),
                example: JSON.stringify(mockResult, null, 2),
                hasMockSyntax: JSON.stringify(props.rule.response).includes('@')
            };
        }
    } catch (error) {
        return {
            template: formatResponseData(props.rule.response),
            example: '解析失败',
            hasMockSyntax: false
        };
    }
});

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
                        @update:model-value="(val: string | number | boolean) => toggleEnabled(!!val)"
                        :disabled="isGloballyDisabled"
                    />
                </el-space>
            </div>
        </template>

        <transition name="card-content" appear>
            <div v-show="!rule.collapsed" class="space-y-2">
                <!-- 响应数据预览 -->
                <div class="relative text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <!-- 详情按钮 -->
                    <el-button type="info" size="small" @click="showDetail" class="absolute top-2 right-2 z-10" circle>
                        <el-icon><View /></el-icon>
                    </el-button>
                    <pre class="font-mono max-h-[160px] overflow-y-auto whitespace-pre-wrap break-words pr-12">{{
                        formatResponseData(rule.response)
                    }}</pre>
                </div>
            </div>
        </transition>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog
        v-model="showDetailDialog"
        :title="`规则详情 - ${rule.method} ${rule.url}`"
        width="80%"
        :before-close="() => (showDetailDialog = false)"
    >
        <div>
            <!-- 响应数据 -->
            <div>
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-lg font-medium">响应数据</h4>
                </div>

                <el-input
                    type="textarea"
                    :model-value="parsedMockData.example"
                    :rows="15"
                    readonly
                    class="font-mono text-sm"
                    resize="none"
                    placeholder="响应数据"
                />
            </div>
        </div>

        <template #footer>
            <el-button @click="showDetailDialog = false">关闭</el-button>
            <el-button
                type="primary"
                @click="
                    editRule;
                    showDetailDialog = false;
                "
                >编辑规则</el-button
            >
        </template>
    </el-dialog>
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
