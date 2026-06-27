import folder_paths
import comfy.sd
import comfy.utils
import json
from collections import OrderedDict


# LoRA 文件缓存（LRU，最多10个）
_lora_cache = OrderedDict()
_LORA_CACHE_MAX = 10


def _load_lora_cached(lora_path):
    """带 LRU 缓存的 LoRA 加载"""
    if lora_path in _lora_cache:
        _lora_cache.move_to_end(lora_path)
        return _lora_cache[lora_path]
    lora = comfy.utils.load_torch_file(lora_path, safe_load=True)
    _lora_cache[lora_path] = lora
    if len(_lora_cache) > _LORA_CACHE_MAX:
        _lora_cache.popitem(last=False)
    return lora


def _safe_float(value, default=1.0):
    """安全地将值转换为浮点数，失败时返回默认值"""
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


class LoRA堆叠加载器:
    def __init__(self):
        self.loaded_lora = None

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "模型": ("MODEL",),
                "CLIP": ("CLIP",),
                # 隐藏参数，用于接收前端传来的 JSON 列表
                "lora_stack_config": ("STRING", {"default": "[]", "multiline": False}),
            }
        }
    
    RETURN_TYPES = ("MODEL", "CLIP")
    RETURN_NAMES = ("模型", "CLIP")
    FUNCTION = "apply_stack"
    CATEGORY = "💝可视化加载器"
    DESCRIPTION = "支持多选 LoRA 并通过列表管理权重。"

    def apply_stack(self, 模型, CLIP, lora_stack_config):
        # 1. 解析前端数据
        try:
            lora_list = json.loads(lora_stack_config)
        except Exception as e:
            print(f"[VisualLoader] JSON 解析错误: {e}")
            return (模型, CLIP)

        if not lora_list:
            return (模型, CLIP)

        current_model = 模型
        current_clip = CLIP

        # 2. 循环加载堆叠
        for item in lora_list:
            lora_name = item.get("name")
            strength_model = _safe_float(item.get("strength_model"), 1.0)
            strength_clip = _safe_float(item.get("strength_clip"), 1.0)

            if strength_model == 0 and strength_clip == 0:
                continue

            try:
                lora_path = folder_paths.get_full_path_or_raise("loras", lora_name)
                lora = _load_lora_cached(lora_path)
                current_model, current_clip = comfy.sd.load_lora_for_models(
                    current_model, current_clip, lora, strength_model, strength_clip
                )
            except Exception as e:
                print(f"[VisualLoader] 加载 LoRA {lora_name} 失败: {e}")
                continue

        return (current_model, current_clip)

class LoRA堆叠加载器_仅模型:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "模型": ("MODEL",),
                "lora_stack_config": ("STRING", {"default": "[]", "multiline": False}),
            }
        }
    
    RETURN_TYPES = ("MODEL",)
    RETURN_NAMES = ("模型",)
    FUNCTION = "apply_stack_model_only"
    CATEGORY = "💝可视化加载器"
    DESCRIPTION = "多选 LoRA (仅模型)，不影响 CLIP。"

    def apply_stack_model_only(self, 模型, lora_stack_config):
        try:
            lora_list = json.loads(lora_stack_config)
        except Exception as e:
            print(f"[VisualLoader] 错误: {e}")
            return (模型,)

        current_model = 模型
        
        for item in lora_list:
            lora_name = item.get("name")
            strength_model = _safe_float(item.get("strength_model"), 1.0)
            
            if strength_model == 0: continue

            try:
                lora_path = folder_paths.get_full_path_or_raise("loras", lora_name)
                lora = _load_lora_cached(lora_path)
                current_model, _ = comfy.sd.load_lora_for_models(
                    current_model, None, lora, strength_model, 0
                )
            except Exception as e:
                print(f"[VisualLoader] 错误: {e}")
                continue

        return (current_model,)