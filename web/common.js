import { api } from "../../scripts/api.js";

// 缓存模型列表数据，避免重复请求
const DATA_CACHE = {};
// 图片对象缓存，避免Canvas重复创建Image对象
export const IMAGE_CACHE = {};

// 获取模型列表的函数
export async function fetchModelList(type) {
    if (DATA_CACHE[type]) {
        return DATA_CACHE[type];
    }

    try {
        const response = await api.fetchApi(`/visual_loader/models?type=${type}`);
        const data = await response.json();
        
        // 预处理数据：提取所有分类
        const categories = new Set(["全部"]);
        data.forEach(item => {
            if (item.category) categories.add(item.category);
        });

        const result = {
            items: data,
            categories: Array.from(categories).sort()
        };
        
        DATA_CACHE[type] = result;
        return result;
    } catch (error) {
        console.error("VisualLoader: 获取模型列表失败", error);
        return { items: [], categories: ["全部"] };
    }
}

// 图片加载器
export function getOrLoadImage(url, callback) {
    if (!url) return null;

    if (IMAGE_CACHE[url]) {
        return IMAGE_CACHE[url];
    }

    const img = new Image();
    img.src = url;
    img.onload = () => {
        IMAGE_CACHE[url] = img;
        if (callback) callback(); // 图片加载完成后触发重绘
    };
    // 先存入缓存防止重复加载
    IMAGE_CACHE[url] = img; 
    return img;
}