import * as monaco from 'monaco-editor';
import loader from '@monaco-editor/loader';

// 配置 Monaco Editor 使用本地资源
loader.config({
    monaco
});

/**
 * Monaco Editor 配置和初始化工具类 - 专门支持JSON格式
 */
export class MonacoEditorManager {
    private editor: monaco.editor.IStandaloneCodeEditor | null = null;
    private container: HTMLElement | null = null;

    /**
     * 配置JSON编辑器主题和样式
     */
    private setupJSONTheme(): void {
        // 定义优化的JSON主题
        monaco.editor.defineTheme('json-theme', {
            base: 'vs',
            inherit: true,
            rules: [
                {token: 'string.key.json', foreground: '#0451a5', fontStyle: 'bold'},
                {token: 'string.value.json', foreground: '#0a7d0a'},
                {token: 'number.json', foreground: '#098658'},
                {token: 'keyword.json', foreground: '#0000ff'},
                {token: 'delimiter.bracket.json', foreground: '#000000'},
                {token: 'delimiter.array.json', foreground: '#000000'},
                {token: 'delimiter.colon.json', foreground: '#000000'},
                {token: 'delimiter.comma.json', foreground: '#000000'}
            ],
            colors: {
                'editor.background': '#ffffff',
                'editor.foreground': '#000000',
                'editor.lineHighlightBackground': '#f5f5f5',
                'editor.selectionBackground': '#add6ff',
                'editorLineNumber.foreground': '#237893',
                'editorIndentGuide.background': '#e3e4e229',
                'editorIndentGuide.activeBackground': '#939393',
                'editorBracketMatch.background': '#0064001a',
                'editorBracketMatch.border': '#b9b9b9'
            }
        });

        // JSON格式验证配置
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            allowComments: false,
            schemas: [],
            enableSchemaRequest: false
        });
    }

    /**
     * 初始化 Monaco Editor
     * @param container - 编辑器容器元素
     * @param value - 初始值
     * @param onChange - 值变化回调
     * @returns Monaco Editor 实例
     */
    public async initEditor(
        container: HTMLElement,
        value: string = '',
        onChange?: (value: string) => void
    ): Promise<monaco.editor.IStandaloneCodeEditor> {
        console.log('MonacoEditorManager: Starting editor initialization');
        console.log('Container:', container);
        console.log('Container dimensions:', container.offsetWidth, 'x', container.offsetHeight);

        this.container = container;

        let monacoInstance: typeof monaco;
        try {
            // 使用 loader 确保 Monaco Editor 正确加载
            console.log('MonacoEditorManager: Loading Monaco instance...');
            monacoInstance = await loader.init();
            console.log('MonacoEditorManager: Monaco instance loaded successfully');

            // 配置JSON编辑器主题和样式
            console.log('MonacoEditorManager: Setting up JSON theme...');
            this.setupJSONTheme();
            console.log('MonacoEditorManager: JSON theme setup completed');
        } catch (error) {
            console.error('MonacoEditorManager: Failed to load Monaco or setup theme:', error);
            throw error;
        }

        // 创建编辑器实例
        console.log('MonacoEditorManager: Creating editor instance...');
        try {
            this.editor = monacoInstance.editor.create(container, {
                value,
                language: 'json',
                theme: 'json-theme',
                lineNumbers: 'on',
                lineNumbersMinChars: 2,
                folding: true,
                wordWrap: 'on',
                formatOnPaste: true,
                formatOnType: true,
                tabSize: 2,
                insertSpaces: true,
                detectIndentation: false,
                bracketPairColorization: {
                    enabled: true
                },
                guides: {
                    bracketPairs: true,
                    indentation: true
                },
                quickSuggestions: {
                    other: false,
                    comments: false,
                    strings: false
                },
                suggest: {
                    showKeywords: true,
                    showSnippets: false,
                    showFunctions: false,
                    showVariables: false,
                    showClasses: false,
                    showModules: false,
                    showProperties: true,
                    showEvents: false,
                    showOperators: false,
                    showUnits: false,
                    showValues: true,
                    showConstants: false,
                    showEnums: false,
                    showEnumMembers: false,
                    showColors: false,
                    showFiles: false,
                    showReferences: false,
                    showFolders: false,
                    showTypeParameters: false,
                    showIssues: false,
                    showUsers: false,
                    showWords: false
                },
                minimap: {
                    enabled: true
                },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                renderWhitespace: 'selection',
                renderControlCharacters: true
            });
            console.log('MonacoEditorManager: Editor instance created successfully');
        } catch (error) {
            console.error('MonacoEditorManager: Failed to create editor instance:', error);
            throw error;
        }

        // 监听内容变化
        if (onChange && this.editor) {
            this.editor.onDidChangeModelContent(() => {
                if (this.editor) {
                    onChange(this.editor.getValue());
                }
            });
        }

        console.log('MonacoEditorManager: Editor initialization completed');
        if (!this.editor) {
            throw new Error('Failed to create Monaco Editor instance');
        }
        return this.editor;
    }

    /**
     * 获取编辑器值
     */
    public getValue(): string {
        return this.editor?.getValue() || '';
    }

    /**
     * 设置编辑器值
     * @param value - 新值
     */
    public setValue(value: string): void {
        if (this.editor) {
            this.editor.setValue(value);
        }
    }

    /**
     * 格式化 JSON
     */
    public async formatJSON(): Promise<void> {
        if (this.editor) {
            try {
                // 尝试使用Monaco编辑器的内置格式化功能
                const action = this.editor.getAction('editor.action.formatDocument');
                if (action) {
                    await action.run();
                } else {
                    // 如果内置格式化不可用，手动格式化
                    this.manualFormatJSON();
                }
            } catch (error) {
                console.warn('Monaco格式化失败，尝试手动格式化:', error);
                this.manualFormatJSON();
            }
        }
    }

    /**
     * 手动格式化 JSON
     */
    private manualFormatJSON(): void {
        if (this.editor) {
            const currentValue = this.editor.getValue();
            if (currentValue.trim()) {
                try {
                    const parsed = JSON.parse(currentValue);
                    const formatted = JSON.stringify(parsed, null, 2);
                    this.editor.setValue(formatted);
                } catch (error) {
                    throw new Error('无效的JSON格式');
                }
            }
        }
    }

    /**
     * 销毁编辑器
     */
    public dispose(): void {
        if (this.editor) {
            this.editor.dispose();
            this.editor = null;
        }
        this.container = null;
    }

    /**
     * 获取编辑器实例
     */
    public getEditor(): monaco.editor.IStandaloneCodeEditor | null {
        return this.editor;
    }
}

/**
 * 创建 Monaco Editor 管理器实例
 */
export function createMonacoEditorManager(): MonacoEditorManager {
    return new MonacoEditorManager();
}
