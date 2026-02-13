import folder_paths
import comfy.sd
import comfy.utils

class Lora加载器_仅模型:
    def __init__(self):
        self.loaded_lora = None

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
    DESCRIPTION = "特殊的 LoRA 加载器，只修改扩散模型（UNet/DiT）部分，不修改 CLIP 文本编码器。适用于某些特定的风格迁移或减少对提示词干扰的场景。"

    def load_lora_model_only(self, 模型, LoRA名称, 模型强度):
        # 逻辑复用 LoRA 加载器的标准流程，但 CLIP 传 None
        lora_path = folder_paths.get_full_path_or_raise("loras", LoRA名称)
        
        lora = None
        if self.loaded_lora is not None:
            if self.loaded_lora[0] == lora_path:
                lora = self.loaded_lora[1]
        
        if lora is None:
            lora = comfy.utils.load_torch_file(lora_path, safe_load=True)
            self.loaded_lora = (lora_path, lora)

        model_lora, _ = comfy.sd.load_lora_for_models(模型, None, lora, 模型强度, 0)
        return (model_lora,)
