# 文件路径: /nodes/visual_lora_only.py

import folder_paths
import comfy.sd

class Lora加载器_仅模型:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "模型": ("MODEL",),
                "LoRA名称": (folder_paths.get_filename_list("loras"), ),
                "模型强度": ("FLOAT", {"default": 1.0, "min": -10.0, "max": 10.0, "step": 0.01}),
            }
        }
    
    RETURN_TYPES = ("MODEL",)
    RETURN_NAMES = ("模型",)
    FUNCTION = "load_lora_model_only"
    CATEGORY = "💝可视化加载器"
    DESCRIPTION = "特殊的 LoRA 加载器，只修改扩散模型（UNet/DiT）部分，不修改 CLIP 文本编码器。适用于某些特定的风格迁移或减少对提示词干扰的场景。"

    def load_lora_model_only(self, 模型, LoRA名称, 模型强度):
        lora_path = folder_paths.get_full_path("loras", LoRA名称)
        # 传入 None 给 CLIP，仅返回修改后的 Model
        model_lora, _ = comfy.sd.load_lora_for_models(模型, None, lora_path, 模型强度, 0)
        return (model_lora,)