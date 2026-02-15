import { app } from "../../scripts/app.js";
// 分别导入两个不同的控制器
import { createSingleWidget } from "./visual_single.js";
import { createStackWidget } from "./visual_stack.js";

const timestamp = new Date().getTime();
const link = document.createElement("link");
link.rel = "stylesheet";
link.type = "text/css";
link.href = new URL(`./style.css?v=${timestamp}`, import.meta.url).href;
document.head.appendChild(link);

const TARGET_NODES = {
    "Checkpoint加载器": "checkpoint",
    "UNET加载器": "unet",
    "Lora加载器": "lora",
    "Lora加载器_仅模型": "lora_only",
    "LoRA堆叠加载器": "lora_stack", 
    "LoRA堆叠加载器_仅模型": "lora_stack_model_only"
};

const OFFSET_MAP = {
    "checkpoint": 10, "unet": 10, "lora": 10, "lora_only": 10,
    "lora_stack": 10, "lora_stack_model_only": 10
};

app.registerExtension({
    name: "Comfy.VisualModelLoader",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (TARGET_NODES[nodeData.name]) {
            const modelType = TARGET_NODES[nodeData.name];
            const isStack = modelType.includes("stack");

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                if (!this.visualContext) {
                    this.visualContext = { category: "全部", search: "" };
                }

                const topOffset = OFFSET_MAP[modelType] || 10;
                // 堆叠节点稍微高一点
                const height = isStack ? 520 : 500;
                this.setSize([340, height + topOffset]);

                // 【核心路由】根据类型选择不同的控制器
                const widgetFactory = isStack ? createStackWidget : createSingleWidget;
                const domWidget = widgetFactory(this, modelType, topOffset, this.visualContext);
                
                this.addDOMWidget(modelType + "_selector", "visual_list", domWidget.widget, {
                    getValue() { return ""; },
                    setValue(v) { },
                });

                return r;
            };

            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function() {
                const r = onConfigure ? onConfigure.apply(this, arguments) : undefined;
                if (this.widgets) {
                    const w = this.widgets.find(w => w.name === "lora_stack_config") || this.widgets[0];
                    if (w && w.value && w.callback) {
                        w.callback(w.value);
                    }
                }
                return r;
            };
        }
    }
});