# 文件路径: /nodes/visual_lora.py
import folder_paths
import comfy.sd
import comfy.utils

class Lora加载器:
    def __init__(self):
        # 缓存机制：避免重复读取硬盘上的 LoRA 文件
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
    # --- 新增描述 ---
    DESCRIPTION = "标准的 LoRA 加载器，可同时修改输入的“模型”和“CLIP”。支持调节模型和 CLIP 的各种强度（正值增强，负值减弱），用于微调画风或角色特征。支持显示预览图与注释编辑。"

    def load_lora(self, 模型, CLIP, LoRA名称, 模型强度, CLIP强度):
        if 模型强度 == 0 and CLIP强度 == 0:
            return (模型, CLIP)

        # 1. 获取完整路径
        lora_path = folder_paths.get_full_path_or_raise("loras", LoRA名称)
        
        # 2. 缓存检查逻辑
        lora = None
        if self.loaded_lora is not None:
            if self.loaded_lora[0] == lora_path:
                lora = self.loaded_lora[1]
            else:
                self.loaded_lora = None

        if lora is None:
            # 【核心修复】必须使用 load_torch_file 加载数据，不能直接传路径字符串
            lora = comfy.utils.load_torch_file(lora_path, safe_load=True)
            self.loaded_lora = (lora_path, lora)

        # 3. 应用 LoRA 补丁
        model_lora, clip_lora = comfy.sd.load_lora_for_models(模型, CLIP, lora, 模型强度, CLIP强度)
        return (model_lora, clip_lora)