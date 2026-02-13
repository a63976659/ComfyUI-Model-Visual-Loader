# 文件路径: /__init__.py

import os
import shutil
import folder_paths

# 映射前端文件目录
WEB_DIRECTORY = "./web"

# 导入节点类 (注意这里导入的是中文类名)
from .nodes.visual_checkpoint import Checkpoint加载器
from .nodes.visual_unet import UNET加载器
from .nodes.visual_lora import Lora加载器
from .nodes.visual_lora_only import Lora加载器_仅模型

# 节点类映射
NODE_CLASS_MAPPINGS = {
    "Checkpoint加载器": Checkpoint加载器,
    "UNET加载器": UNET加载器,
    "Lora加载器": Lora加载器,
    "Lora加载器_仅模型": Lora加载器_仅模型
}

# 节点显示名称映射 (UI上显示的名称)
NODE_DISPLAY_NAME_MAPPINGS = {
    "Checkpoint加载器": "Checkpoint 加载器",
    "UNET加载器": "UNET 加载器",
    "Lora加载器": "LoRA 加载器",
    "Lora加载器_仅模型": "LoRA 加载器 (仅模型)"
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]