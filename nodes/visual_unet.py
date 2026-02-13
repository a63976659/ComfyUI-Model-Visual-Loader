# 文件路径: /nodes/visual_unet.py

import folder_paths
import comfy.sd

class UNET加载器:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "UNET名称": (folder_paths.get_filename_list("diffusion_models"), ),
                "权重类型": (["default", "fp8_e4m3fn", "fp8_e4m3fn_fast", "fp8_e5m2"],)
            }
        }
    
    RETURN_TYPES = ("MODEL",)
    RETURN_NAMES = ("模型",)
    FUNCTION = "load_unet"
    CATEGORY = "💝可视化加载器"
    DESCRIPTION = "仅加载模型的 UNET 部分（扩散模型核心）。通常用于高级工作流，例如需要单独替换 UNET 或使用 GGUF/NF4 格式量化模型时使用。"

    def load_unet(self, UNET名称, 权重类型):
        unet_path = folder_paths.get_full_path("diffusion_models", UNET名称)
        model = comfy.sd.load_unet(unet_path)
        return (model,)