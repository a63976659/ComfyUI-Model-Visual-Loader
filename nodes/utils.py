# nodes/utils.py
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

# 2. 模型类型映射
TYPE_MAP = {
    "checkpoint": ["checkpoints"],
    "unet": ["diffusion_models", "unet"],
    "lora": ["loras"],
    "lora_only": ["loras"] 
}

# 3. 获取并缓存图片的函数
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
    hash_name = hashlib.md5(model_path.encode('utf-8')).hexdigest() + ".png"
    cached_file_path = os.path.join(CACHE_DIR, hash_name)
    
    need_generate = True
    if os.path.exists(cached_file_path):
        try:
            src_mtime = os.path.getmtime(image_source)
            cache_mtime = os.path.getmtime(cached_file_path)
            if cache_mtime > src_mtime:
                need_generate = False
        except Exception:
            need_generate = True

    if need_generate:
        try:
            with Image.open(image_source) as img:
                if img.mode not in ("RGB", "RGBA"):
                    img = img.convert("RGB")
                width = 512
                if img.size[0] > 0:
                    ratio = width / float(img.size[0])
                    height = int((float(img.size[1]) * float(ratio)))
                    img = img.resize((width, height), Image.LANCZOS)
                    img.save(cached_file_path, "PNG")
        except Exception as e:
            print(f"[VisualLoader] 图片缓存失败: {e}")
            if not os.path.exists(cached_file_path):
                return None
    
    try:
        timestamp = os.path.getmtime(cached_file_path)
    except:
        timestamp = 0
    return f"/visual_loader/view_cache?filename={hash_name}&t={timestamp}"

# 4. 获取模型列表
def get_model_list(model_type):
    data_list = []
    folders = TYPE_MAP.get(model_type, [])
    
    for folder_name in folders:
        try:
            filenames = folder_paths.get_filename_list(folder_name)
        except:
            continue
            
        for filename in filenames:
            full_path = folder_paths.get_full_path(folder_name, filename)
            subfolder = os.path.dirname(filename)
            category = subfolder if subfolder else "根目录"
            image_url = get_cached_image_path(full_path)
            
            data_list.append({
                "name": filename,
                "image": image_url,
                "category": category
            })
            
    return data_list

# --- 新增：获取对应的 txt 路径 ---
def get_notes_path(model_type, model_name):
    folders = TYPE_MAP.get(model_type, [])
    if not folders:
        return None
    
    # 尝试在所有可能的文件夹中查找该模型文件
    for folder_name in folders:
        try:
            full_path = folder_paths.get_full_path(folder_name, model_name)
            if full_path and os.path.exists(full_path):
                # 将后缀改为 .txt
                base_name, _ = os.path.splitext(full_path)
                return base_name + ".txt"
        except:
            continue
    return None

# 5. API 路由
@PromptServer.instance.routes.get("/visual_loader/models")
async def api_get_models(request):
    m_type = request.rel_url.query.get("type", "checkpoint")
    data = get_model_list(m_type)
    return web.json_response(data)

@PromptServer.instance.routes.get("/visual_loader/view_cache")
async def api_view_cache(request):
    filename = request.rel_url.query.get("filename", "")
    file_path = os.path.join(CACHE_DIR, filename)
    if os.path.exists(file_path):
        return web.FileResponse(file_path)
    return web.Response(status=404)

# --- 新增：注释相关 API ---

@PromptServer.instance.routes.get("/visual_loader/notes")
async def api_get_notes(request):
    m_type = request.rel_url.query.get("type")
    m_name = request.rel_url.query.get("name")
    
    txt_path = get_notes_path(m_type, m_name)
    content = ""
    
    if txt_path and os.path.exists(txt_path):
        try:
            with open(txt_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception as e:
            print(f"读取注释失败: {e}")
            
    return web.json_response({"content": content})

@PromptServer.instance.routes.post("/visual_loader/notes")
async def api_save_notes(request):
    try:
        data = await request.json()
        m_type = data.get("type")
        m_name = data.get("name")
        content = data.get("content", "")
        
        txt_path = get_notes_path(m_type, m_name)
        if not txt_path:
            return web.Response(status=404, text="Model not found")
            
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        return web.json_response({"status": "success"})
    except Exception as e:
        return web.Response(status=500, text=str(e))