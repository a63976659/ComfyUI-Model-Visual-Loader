# 文件路径: /nodes/visual_lora_only.py

import folder_paths
import comfy.sd
import comfy.utils

class Lora加载器_仅模型:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "模型": ("MODEL",),
                "LoRA名称": (folder_paths.get_filename_list("loras"), ),
                "模型强度": ("FLOAT", {"default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01}),
            }
        }
    
    RETURN_TYPES = ("MODEL",)
    RETURN_NAMES = ("模型",)
    FUNCTION = "load_lora_model_only"
    CATEGORY = "💝可视化加载器"
    DESCRIPTION = "参考官方 LoraLoaderModelOnly 实现。修复了因直接传递路径导致的类型错误。"

    def load_lora_model_only(self, 模型, LoRA名称, 模型强度):
        if 模型强度 == 0:
            return (模型,)

        # 1. 获取完整路径
        lora_path = folder_paths.get_full_path("loras", LoRA名称)
        
        # 2. 【核心修复】像官方一样先加载文件内容为字典，而不是直接传路径字符串
        lora_data = comfy.utils.load_torch_file(lora_path, safe_load=True)
        
        # 3. 传入加载好的 lora_data，而不是 lora_path
        model_lora, _ = comfy.sd.load_lora_for_models(模型, None, lora_data, 模型强度, 0)
        
        return (model_lora,)