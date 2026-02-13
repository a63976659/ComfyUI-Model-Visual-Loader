# nodes/utils.py
import os
import hashlib
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
# 【关键修复】增加了 "lora_only" 指向 "loras"
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
    
    if not os.path.exists(cached_file_path):
        try:
            with Image.open(image_source) as img:
                width = 512
                ratio = width / float(img.size[0])
                height = int((float(img.size[1]) * float(ratio)))
                img = img.resize((width, height), Image.LANCZOS)
                img.save(cached_file_path, "PNG")
        except Exception as e:
            print(f"[VisualLoader] 图片缓存失败: {e}")
            return None

    return f"/visual_loader/view_cache?filename={hash_name}"

# 4. 获取模型列表
def get_model_list(model_type):
    data_list = []
    # 如果类型不存在，默认空列表
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