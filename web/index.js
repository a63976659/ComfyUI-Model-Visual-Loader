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
    "checkpoint": 10,   // 已按您的要求改为 10
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
                
                // 【核心修改】初始化持久化状态对象
                // 这个对象挂载在 node 实例上，只要节点不被删除，数据就在
                if (!this.visualContext) {
                    this.visualContext = {
                        category: "全部",
                        search: ""
                    };
                }

                const topOffset = OFFSET_MAP[modelType] || 10;
                
                this.setSize([340, 500 + topOffset]);

                // 【核心修改】将状态对象传递给 DOM 组件
                const domWidget = createVisualWidget(this, modelType, topOffset, this.visualContext);
                
                this.addDOMWidget(modelType + "_selector", "visual_list", domWidget.widget, {
                    getValue() { return ""; },
                    setValue(v) { },
                });

                return r;
            };
        }
    }
});