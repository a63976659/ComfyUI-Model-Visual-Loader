import folder_paths
import comfy.sd
import torch # 必须导入 torch 以支持权重类型转换

class UNET加载器:
    @classmethod
    def INPUT_TYPES(s):
        dtype_list = ["default"]
        if hasattr(torch, "float8_e4m3fn"):
            dtype_list.extend(["fp8_e4m3fn", "fp8_e4m3fn_fast"])
        if hasattr(torch, "float8_e5m2"):
            dtype_list.append("fp8_e5m2")
        return {
            "required": {
                "UNET名称": (folder_paths.get_filename_list("diffusion_models"), ),
                "权重类型": (dtype_list,)
            }
        }
    
    RETURN_TYPES = ("MODEL",)
    RETURN_NAMES = ("模型",)
    FUNCTION = "load_unet"
    CATEGORY = "💝可视化加载器"
    DESCRIPTION = "仅加载模型的 UNET 部分（扩散模型核心）。通常用于高级工作流，例如需要单独替换 UNET 或使用 GGUF/NF4 格式量化模型时使用。"

    def load_unet(self, UNET名称, 权重类型):
        model_options = {}
        # 官方标准的 FP8 优化逻辑
        if 权重类型 == "fp8_e4m3fn":
            model_options["dtype"] = torch.float8_e4m3fn
        elif 权重类型 == "fp8_e4m3fn_fast":
            model_options["dtype"] = torch.float8_e4m3fn
            model_options["fp8_optimizations"] = True
        elif 权重类型 == "fp8_e5m2":
            model_options["dtype"] = torch.float8_e5m2

        unet_path = folder_paths.get_full_path_or_raise("diffusion_models", UNET名称)
        # 使用 load_diffusion_model 代替旧的 load_unet 以支持 options
        model = comfy.sd.load_diffusion_model(unet_path, model_options=model_options)
        return (model,)
