import { app } from "../../scripts/app.js";
import { createVisualWidget } from "./dom_widget.js";

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
    "Lora加载器_仅模型": "lora_only"
};

const OFFSET_MAP = {
    "checkpoint": 10,
    "unet": 10,         
    "lora": 10,         
    "lora_only": 10     
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

                const topOffset = OFFSET_MAP[modelType] || 10;
                this.setSize([340, 500 + topOffset]);

                const domWidget = createVisualWidget(this, modelType, topOffset, this.visualContext);
                
                this.addDOMWidget(modelType + "_selector", "visual_list", domWidget.widget, {
                    getValue() { return ""; },
                    setValue(v) { },
                });

                return r;
            };

            // --- 【核心修改】处理工作流加载后的初始同步 ---
            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function() {
                const r = onConfigure ? onConfigure.apply(this, arguments) : undefined;
                if (this.widgets && this.widgets[0]) {
                    // 确保在工作流数据填入后手动触发一次 callback 以更新视觉 UI
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