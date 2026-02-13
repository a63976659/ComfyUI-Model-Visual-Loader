import folder_paths
import comfy.sd
from .utils import get_model_list

class Checkpoint加载器:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                # 保持中文键名，确保前端能找到这个 widget
                "模型名称": (folder_paths.get_filename_list("checkpoints"), ),
            }
        }
    
    RETURN_TYPES = ("MODEL", "CLIP", "VAE")
    RETURN_NAMES = ("模型", "CLIP", "VAE")
    FUNCTION = "load_checkpoint"
    CATEGORY = "💝可视化加载器"
    DESCRIPTION = "用于加载 Checkpoint 大模型（如 .safetensors 或 .ckpt 文件）。包含模型本体、CLIP文本编码器和VAE变分自编码器。支持显示模型封面图。"

    def load_checkpoint(self, 模型名称):
        # 使用官方标准路径获取方式
        ckpt_path = folder_paths.get_full_path_or_raise("checkpoints", 模型名称)
        # 官方标准的加载函数，支持 guess_config 和 embeddings 目录映射
        out = comfy.sd.load_checkpoint_guess_config(
            ckpt_path, 
            output_vae=True, 
            output_clip=True, 
            embedding_directory=folder_paths.get_folder_paths("embeddings")
        )
        return out[:3]
