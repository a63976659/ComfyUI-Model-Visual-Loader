import os
import hashlib
import json
import folder_paths
from server import PromptServer
from aiohttp import web
from PIL import Image

# 1. 缓存路径设置
CURRENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(CURRENT_DIR, "cached_images")

if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

# 2. 类型映射：前端类型 -> ComfyUI 文件夹名称
# 这一点非常重要，因为前端传来的可能是 "lora_stack"，必须转为 "loras" 才能找到文件
FOLDER_MAP = {
    "checkpoint": "checkpoints",
    "unet": "diffusion_models",
    "lora": "loras",
    "lora_only": "loras",
    "lora_stack": "loras",
    "lora_stack_model_only": "loras"
}

# 3. 辅助函数：获取同名 txt 路径
def get_note_path(folder_type, filename):
    try:
        # 获取模型文件的绝对路径
        model_path = folder_paths.get_full_path(folder_type, filename)
        if not model_path:
            return None
        
        # 将后缀替换为 .txt
        base_path = os.path.splitext(model_path)[0]
        return base_path + ".txt"
    except:
        return None

# 4. 获取并缓存图片的函数 (保持不变)
def get_cached_image_path(model_path):
    base_name, _ = os.path.splitext(model_path)
    image_source = None
    
    # 查找同名图片
    for ext in [".png", ".jpg", ".jpeg", ".webp"]:
        if os.path.exists(base_name + ext):
            image_source = base_name + ext
            break
            
    if not image_source:
        return None

    # 生成缓存文件名
    hash_name = hashlib.md5(model_path.encode('utf-8')).hexdigest()
    cache_filename = hash_name + ".png"
    cache_path = os.path.join(CACHE_DIR, cache_filename)
    
    # 转换为 Web 访问路径
    web_path = f"/visual_loader/view_cache?filename={cache_filename}"

    if os.path.exists(cache_path):
        return web_path

    try:
        img = Image.open(image_source)
        # 统一转换为 RGB 并缩放，减少前端压力
        if img.mode != "RGB":
            img = img.convert("RGB")
        
        # 限制最大尺寸 (例如宽 512)
        max_size = (512, 512)
        img.thumbnail(max_size)
        
        img.save(cache_path, "PNG")
        return web_path
    except Exception as e:
        print(f"[VisualLoader] 图片缓存失败: {e}")
        return None

# 5. 获取模型列表 (保持不变，微调类型映射)
def get_model_list(model_type):
    data_list = []
    seen_names = set()
    
    # 将前端类型转换为文件夹名称
    folder_type = FOLDER_MAP.get(model_type, model_type)
    
    # 获取该类型下的所有文件名
    try:
        filenames = folder_paths.get_filename_list(folder_type)
    except:
        return []

    for filename in filenames:
        if filename in seen_names:
            continue
            
        full_path = folder_paths.get_full_path(folder_type, filename)
        if not full_path:
            continue

        seen_names.add(filename)
        
        subfolder = os.path.dirname(filename)
        category = subfolder if subfolder else "根目录"
        
        image_url = get_cached_image_path(full_path)
        
        data_list.append({
            "name": filename,
            "image": image_url,
            "category": category
        })
            
    return data_list

# =========================================================
# API 路由定义
# =========================================================

# 获取模型列表
@PromptServer.instance.routes.get("/visual_loader/models")
async def api_get_models(request):
    m_type = request.rel_url.query.get("type", "checkpoint")
    data = get_model_list(m_type)
    return web.json_response(data)

# 获取缓存图片
@PromptServer.instance.routes.get("/visual_loader/view_cache")
async def api_view_cache(request):
    filename = request.rel_url.query.get("filename")
    if not filename:
        return web.Response(status=404)
        
    file_path = os.path.join(CACHE_DIR, filename)
    if os.path.exists(file_path):
        return web.FileResponse(file_path)
    return web.Response(status=404)

# 【新增】获取注释
@PromptServer.instance.routes.get("/visual_loader/notes")
async def api_get_notes(request):
    m_type = request.rel_url.query.get("type")
    name = request.rel_url.query.get("name")
    
    if not m_type or not name:
        return web.json_response({"content": ""})

    folder_type = FOLDER_MAP.get(m_type, m_type)
    note_path = get_note_path(folder_type, name)

    if note_path and os.path.exists(note_path):
        try:
            with open(note_path, "r", encoding="utf-8") as f:
                content = f.read()
            return web.json_response({"content": content})
        except Exception as e:
            print(f"[VisualLoader] 读取注释失败: {e}")
            return web.json_response({"content": "读取错误"})
    
    return web.json_response({"content": ""})

@PromptServer.instance.routes.post("/visual_loader/notes")
async def api_save_notes(request):
    try:
        json_data = await request.json()
        m_type = json_data.get("type")
        name = json_data.get("name")
        content = json_data.get("content", "")

        folder_type = FOLDER_MAP.get(m_type, m_type)
        note_path = get_note_path(folder_type, name)

        if not note_path:
            return web.Response(status=400, text="无法定位模型路径")

        # 写入文件
        with open(note_path, "w", encoding="utf-8") as f:
            f.write(content)
            
        return web.json_response({"status": "success"})
        
    except Exception as e:
        print(f"[VisualLoader] 保存注释失败: {e}")
        return web.Response(status=500, text=str(e))