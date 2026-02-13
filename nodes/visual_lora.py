# 文件路径: /nodes/visual_lora.py

import folder_paths
import comfy.sd

class Lora加载器:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "模型": ("MODEL",),
                "CLIP": ("CLIP",),
                "LoRA名称": (folder_paths.get_filename_list("loras"), ),
                "模型强度": ("FLOAT", {"default": 1.0, "min": -10.0, "max": 10.0, "step": 0.01}),
                "CLIP强度": ("FLOAT", {"default": 1.0, "min": -10.0, "max": 10.0, "step": 0.01}),
            }
        }
    
    RETURN_TYPES = ("MODEL", "CLIP")
    RETURN_NAMES = ("模型", "CLIP")
    FUNCTION = "load_lora"
    CATEGORY = "💝可视化加载器"
    DESCRIPTION = "标准的 LoRA 加载器。它会同时修改输入的‘模型’和‘CLIP’。支持调节模型和CLIP的各种强度，用于微调画风或角色。"

    def load_lora(self, 模型, CLIP, LoRA名称, 模型强度, CLIP强度):
        lora_path = folder_paths.get_full_path("loras", LoRA名称)
        model_lora, clip_lora = comfy.sd.load_lora_for_models(模型, CLIP, lora_path, 模型强度, CLIP强度)
        return (model_lora, clip_lora)