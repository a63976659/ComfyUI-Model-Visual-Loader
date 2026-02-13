# 文件路径: /nodes/visual_unet.py

import folder_paths
import comfy.sd
import torch

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
    DESCRIPTION = "参考官方 UNETLoader 实现。支持可视化选择并正确配置权重精度。"

    def load_unet(self, UNET名称, 权重类型):
        model_options = {}
        if 权重类型 == "fp8_e4m3fn":
            model_options["dtype"] = torch.float8_e4m3fn
        elif 权重类型 == "fp8_e4m3fn_fast":
            model_options["dtype"] = torch.float8_e4m3fn
            model_options["fp8_optimizations"] = True
        elif 权重类型 == "fp8_e5m2":
            model_options["dtype"] = torch.float8_e5m2

        # 使用官方推荐的加载方式
        unet_path = folder_paths.get_full_path_or_raise("diffusion_models", UNET名称)
        model = comfy.sd.load_diffusion_model(unet_path, model_options=model_options)
        return (model,)