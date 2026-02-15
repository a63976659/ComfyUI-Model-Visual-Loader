import { app } from "../../scripts/app.js";
import { createVisualWidget } from "./dom_widget.js";

// 引入样式
const timestamp = new Date().getTime();
const link = document.createElement("link");
link.rel = "stylesheet";
link.type = "text/css";
link.href = new URL(`./style.css?v=${timestamp}`, import.meta.url).href;
document.head.appendChild(link);

// 【关键配置】将 Python 类名映射到前端逻辑类型
// 左边是 Python 中的类名 (NODE_CLASS_MAPPINGS 的 Key)
// 右边是传给 createVisualWidget 的类型参数
const TARGET_NODES = {
    "Checkpoint加载器": "checkpoint",
    "UNET加载器": "unet",
    "Lora加载器": "lora",
    "Lora加载器_仅模型": "lora_only",
    // 新增：识别中文类名，并标记为 stack 类型
    "LoRA堆叠加载器": "lora_stack", 
    "LoRA堆叠加载器_仅模型": "lora_stack_model_only"
};

const OFFSET_MAP = {
    "checkpoint": 10,
    "unet": 10,         
    "lora": 10,         
    "lora_only": 10,
    // 堆叠节点不需要太高的顶部偏移
    "lora_stack": 10, 
    "lora_stack_model_only": 10
};

app.registerExtension({
    name: "Comfy.VisualModelLoader",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (TARGET_NODES[nodeData.name]) {
            const modelType = TARGET_NODES[nodeData.name];

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                if (!this.visualContext) {
                    this.visualContext = { category: "全部", search: "" };
                }

                // 设置节点大小
                const topOffset = OFFSET_MAP[modelType] || 10;
                this.setSize([340, 520]); // 稍微增加一点高度以容纳列表

                // 创建可视化 Widget
                const domWidget = createVisualWidget(this, modelType, topOffset, this.visualContext);
                
                // 将 DOM 挂载到节点上
                // 注意：对于堆叠节点，我们仍然使用 hidden 字符串来存储数据，
                // 但 UI 操作完全由 domWidget 接管
                this.addDOMWidget(modelType + "_selector", "visual_list", domWidget.widget, {
                    getValue() { return ""; },
                    setValue(v) { },
                });

                return r;
            };

            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function() {
                const r = onConfigure ? onConfigure.apply(this, arguments) : undefined;
                if (this.widgets && this.widgets[0]) {
                    const val = this.widgets[0].value;
                    if (this.widgets[0].callback) {
                        this.widgets[0].callback(val);
                    }
                }
                return r;
            };
        }
    }
});