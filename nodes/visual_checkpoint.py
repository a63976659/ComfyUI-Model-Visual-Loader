# 文件路径: /nodes/visual_checkpoint.py
import folder_paths
import comfy.sd

class Checkpoint加载器:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "模型名称": (folder_paths.get_filename_list("checkpoints"), ),
            }
        }
    
    RETURN_TYPES = ("MODEL", "CLIP", "VAE")
    RETURN_NAMES = ("模型", "CLIP", "VAE")
    FUNCTION = "load_checkpoint"
    CATEGORY = "💝可视化加载器"
    # --- 新增描述 ---
    DESCRIPTION = "用于加载 Checkpoint 大模型（如 .safetensors 或 .ckpt 文件）。包含模型本体、CLIP 文本编码器和 VAE 变分自编码器。支持显示模型预览图并可查看关联的文本注释。"

    def load_checkpoint(self, 模型名称):
        # 使用官方更严谨的路径获取方式
        ckpt_path = folder_paths.get_full_path_or_raise("checkpoints", 模型名称)
        out = comfy.sd.load_checkpoint_guess_config(ckpt_path, output_vae=True, output_clip=True, embedding_directory=folder_paths.get_folder_paths("embeddings"))
        return out[:3]