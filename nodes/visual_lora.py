import folder_paths
import comfy.sd
import comfy.utils

class Lora加载器:
    def __init__(self):
        self.loaded_lora = None

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "模型": ("MODEL",),
                "CLIP": ("CLIP",),
                "LoRA名称": (folder_paths.get_filename_list("loras"), ),
                "模型强度": ("FLOAT", {"default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01}),
                "CLIP强度": ("FLOAT", {"default": 1.0, "min": -100.0, "max": 100.0, "step": 0.01}),
            }
        }
    
    RETURN_TYPES = ("MODEL", "CLIP")
    RETURN_NAMES = ("模型", "CLIP")
    FUNCTION = "load_lora"
    CATEGORY = "💝可视化加载器"
    DESCRIPTION = "标准的 LoRA 加载器，支持缓存机制以提升性能。"

    def load_lora(self, 模型, CLIP, LoRA名称, 模型强度, CLIP强度):
        if 模型强度 == 0 and CLIP强度 == 0:
            return (模型, CLIP)

        lora_path = folder_paths.get_full_path_or_raise("loras", LoRA名称)
        
        # 官方 LoRA 缓存逻辑
        lora = None
        if self.loaded_lora is not None:
            if self.loaded_lora[0] == lora_path:
                lora = self.loaded_lora[1]
            else:
                self.loaded_lora = None

        if lora is None:
            lora = comfy.utils.load_torch_file(lora_path, safe_load=True)
            self.loaded_lora = (lora_path, lora)

        model_lora, clip_lora = comfy.sd.load_lora_for_models(模型, CLIP, lora, 模型强度, CLIP强度)
        return (model_lora, clip_lora)

