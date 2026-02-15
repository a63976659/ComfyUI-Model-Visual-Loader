# 文件路径: /__init__.py

import os
import shutil
import folder_paths

# 映射前端文件目录
WEB_DIRECTORY = "./web"

# 导入节点
from .nodes.visual_checkpoint import Checkpoint加载器
from .nodes.visual_unet import UNET加载器
from .nodes.visual_lora import Lora加载器
from .nodes.visual_lora_only import Lora加载器_仅模型
from .nodes.visual_lora_stack import LoRA堆叠加载器, LoRA堆叠加载器_仅模型

# 节点类映射 (决定了 ComfyUI 内部识别的节点 ID)
NODE_CLASS_MAPPINGS = {
    "Checkpoint加载器": Checkpoint加载器,
    "UNET加载器": UNET加载器,
    "Lora加载器": Lora加载器,
    "Lora加载器_仅模型": Lora加载器_仅模型,
    "Lora堆加载器": LoRA堆叠加载器,
    "Lora堆加载器_仅模型": LoRA堆叠加载器_仅模型
}

# 节点显示名称映射 (决定了 UI 上显示的标题)
NODE_DISPLAY_NAME_MAPPINGS = {
    "Checkpoint加载器": "Checkpoint 加载器",
    "UNET加载器": "UNet加载器",
    "Lora加载器": "Lora加载器",
    "Lora加载器_仅模型": "Lora加载器(仅模型)",
    "Lora堆加载器": "Lora堆加载器",
    "Lora堆加载器_仅模型": "Lora堆(仅模型)"
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]