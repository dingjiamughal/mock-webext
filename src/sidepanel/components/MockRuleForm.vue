<script setup lang="ts">
import {ref, computed, nextTick, watch, PropType} from 'vue';
import {Delete} from '@element-plus/icons-vue';
import {createMonacoEditorManager, MonacoEditorManager} from './monacoEditor';
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

interface Emits {
    (e: 'close'): void;
    (e: 'save', rule: MockRule): void;
}

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    editingRule: {
        type: Object as PropType<MockRule | null>,
        default: null
    }
});

const emit = defineEmits<Emits>();

const editorContainer = ref<HTMLElement | null>(null);
let editorManager: MonacoEditorManager | null = null;
console.log('aaaa mockruleform');
// 表单数据
const formData = ref<Partial<MockRule>>({
    url: '',
    method: 'GET',
    matchType: 'contains',
    status: 200,
    delay: 0,
    response: '',
    enabled: true
});

// 计算属性
const isEditing = computed(() => props.editingRule !== null);
const dialogVisible = computed({
    get: () => props.visible,
    set: (value: boolean) => {
        if (!value) {
            emit('close');
        }
    }
});

// 初始化 Monaco Editor
async function initMonacoEditor() {
    if (!editorContainer.value) {
        console.warn('Monaco Editor container not found');
        return;
    }

    // 检查容器尺寸
    const containerRect = editorContainer.value.getBoundingClientRect();
    console.log('Container rect:', containerRect);

    if (containerRect.width === 0 || containerRect.height === 0) {
        console.warn('Container has zero dimensions, retrying in 200ms...');
        setTimeout(() => initMonacoEditor(), 200);
        return;
    }

    try {
        console.log('Initializing Monaco Editor...');
        editorManager = createMonacoEditorManager();
        await editorManager.initEditor(editorContainer.value, formData.value.response || '', (value: string) => {
            formData.value.response = value;
        });
        console.log('Monaco Editor initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Monaco Editor:', error);
    }
}

// 销毁编辑器
function disposeMonacoEditor() {
    if (editorManager) {
        editorManager.dispose();
        editorManager = null;
    }
}

// 格式化JSON
async function formatJSON() {
    if (editorManager) {
        try {
            await editorManager.formatJSON();
        } catch (error) {
            console.error('格式化失败:', error);
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            alert('格式化失败：' + errorMessage);
        }
    } else {
        console.warn('编辑器未初始化，无法格式化');
        alert('编辑器未初始化，请稍后再试');
    }
}

// 预览MockJS生成的数据
function previewMockData() {
    const template = editorManager?.getValue() || formData.value.response || '';
    try {
        const parsed = JSON.parse(template);
        const mockData = Mock.mock(parsed);
        const formatted = JSON.stringify(mockData, null, 2);

        // 创建预览窗口
        const previewWindow = window.open('', '_blank', 'width=600,height=500');
        if (previewWindow) {
            previewWindow.document.write(`
                <html>
                    <head><title>MockJS预览</title></head>
                    <body>
                        <h3>MockJS生成的数据预览：</h3>
                        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${formatted}</pre>
                    </body>
                </html>
            `);
        }
    } catch (error) {
        alert('预览失败：' + error);
    }
}

// 重置表单
function resetForm() {
    formData.value = {
        url: '',
        method: 'GET',
        matchType: 'contains',
        status: 200,
        delay: 0,
        response: '',
        enabled: true
    };
}

// 关闭表单
function closeForm() {
    resetForm();
    emit('close');
}

// 处理弹窗关闭
function handleClose() {
    closeForm();
}

// 保存规则
function saveRule() {
    if (!formData.value.url) {
        alert('请输入URL');
        return;
    }

    try {
        // 解析响应数据
        let responseData = formData.value.response;
        if (typeof responseData === 'string' && responseData.trim()) {
            try {
                responseData = JSON.parse(responseData);
            } catch {
                // 如果不是有效JSON，保持字符串格式
            }
        }

        const ruleId = `${formData.value.url}_${formData.value.method || 'GET'}`;
        const newRule: MockRule = {
            id: ruleId,
            url: formData.value.url!,
            method: formData.value.method || 'GET',
            matchType: formData.value.matchType || 'contains',
            status: formData.value.status || 200,
            delay: formData.value.delay || 0,
            response: responseData,
            enabled:
                typeof formData.value.enabled === 'string'
                    ? formData.value.enabled !== 'false'
                    : formData.value.enabled !== false,
            collapsed: false
        };

        emit('save', newRule);
        closeForm();
        alert(isEditing.value ? '规则更新成功！' : '规则添加成功！');
    } catch (error) {
        alert('保存失败：' + error);
    }
}

// 监听编辑规则变化
watch(
    () => props.editingRule,
    newRule => {
        if (newRule) {
            formData.value = {
                ...newRule,
                response:
                    typeof newRule.response === 'object' ? JSON.stringify(newRule.response, null, 2) : newRule.response
            };
            // 更新编辑器内容
            nextTick(() => {
                if (editorManager) {
                    editorManager.setValue(formData.value.response || '');
                }
            });
        } else {
            resetForm();
        }
    },
    {immediate: true}
);

// 监听表单显示状态，初始化编辑器
watch(
    () => props.visible,
    newVal => {
        console.log(newVal, 'dddd');
        if (newVal) {
            console.log('aaaa');
            nextTick(() => {
                setTimeout(() => {
                    initMonacoEditor();
                }, 100);
            });
        } else {
            disposeMonacoEditor();
        }
    }
);
</script>

<template>
    <el-dialog
        v-model="dialogVisible"
        :title="isEditing ? '编辑规则' : '添加规则'"
        width="600px"
        :before-close="handleClose"
        destroy-on-close
    >
        <el-form :model="formData" label-width="70px" size="small">
            <el-form-item label="URL">
                <el-input v-model="formData.url" placeholder="例如: /api/users" />
            </el-form-item>

            <el-row :gutter="12">
                <el-col :span="12">
                    <el-form-item label="方法">
                        <el-select v-model="formData.method" style="width: 100%">
                            <el-option label="GET" value="GET" />
                            <el-option label="POST" value="POST" />
                            <el-option label="PUT" value="PUT" />
                            <el-option label="DELETE" value="DELETE" />
                            <el-option label="PATCH" value="PATCH" />
                            <el-option label="ALL" value="ALL" />
                        </el-select>
                    </el-form-item>
                </el-col>
                <el-col :span="12">
                    <el-form-item label="匹配">
                        <el-select v-model="formData.matchType" style="width: 100%">
                            <el-option label="包含" value="contains" />
                            <el-option label="精确" value="exact" />
                            <el-option label="正则" value="regex" />
                        </el-select>
                    </el-form-item>
                </el-col>
            </el-row>

            <el-row :gutter="12">
                <el-col :span="12">
                    <el-form-item label="状态码">
                        <el-input-number v-model="formData.status" :min="100" :max="599" style="width: 100%" />
                    </el-form-item>
                </el-col>
                <el-col :span="12">
                    <el-form-item label="延迟">
                        <el-input-number v-model="formData.delay" :min="0" style="width: 100%" />
                    </el-form-item>
                </el-col>
            </el-row>

            <el-form-item label="" label-width="0">
                <div class="w-full">
                    <!-- 编辑器工具栏 -->
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-2">
                            <el-button size="small" @click="formatJSON"> 格式化 </el-button>
                            <el-button size="small" type="primary" @click="previewMockData"> 预览 </el-button>
                        </div>
                        <el-text size="small" type="info"
                            >可使用mockjs语法，如：@cname、@email、@integer(1,100)
                        </el-text>
                    </div>

                    <!-- Monaco Editor -->
                    <div ref="editorContainer" class="monaco-editor-container"></div>
                </div>
            </el-form-item>

            <el-form-item>
                <el-checkbox v-model="formData.enabled"> 启用此规则 </el-checkbox>
            </el-form-item>
        </el-form>

        <template #footer>
            <div class="dialog-footer">
                <el-button @click="closeForm"> 取消 </el-button>
                <el-button type="primary" @click="saveRule">
                    {{ isEditing ? '更新' : '保存' }}
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>
/* 编辑器相关样式 */
.monaco-editor {
    border-radius: 4px;
}

.monaco-editor-container {
    height: 200px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    overflow: hidden;
}

/* 弹窗底部按钮样式 */
.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}
</style>
