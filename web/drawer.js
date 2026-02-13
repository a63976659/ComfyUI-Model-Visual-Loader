import { getOrLoadImage } from "./common.js";

// 兼容性辅助函数：绘制圆角矩形
function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        ctx.fill();
        return;
    }
    if (typeof radius === 'undefined') radius = 5;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

export class VisualDrawer {
    constructor(node, modelType) {
        this.node = node;
        this.modelType = modelType;
        
        // 数据
        this.items = [];
        this.categories = ["全部"];
        this.currentCategory = "全部";
        this.searchQuery = "";
        
        // 滚动与布局
        this.scrollY = 0;
        this.contentHeight = 0;
        
        // 【布局核心参数】
        // layoutOffset: 顶部留出的空间（给原生Widget和输出端口）
        this.layoutOffset = 60; 
        
        // 控制区高度 (分类+搜索)
        this.controlsHeight = 40;
        
        // 信息区高度 (选中模型名)
        this.infoBarHeight = 35;
        
        // 网格区起始位置 = 偏移 + 控制区 + 信息区 + 间距
        this.gridStartY = this.layoutOffset + this.controlsHeight + this.infoBarHeight + 10;
        
        this.margin = 10;
        
        // 样式
        this.bgColor = "#222"; 
        this.areaBgColor = "#1a1a1a"; // 视觉容器背景
        this.searchBgColor = "#000";
        this.dropdownBgColor = "#333";
        this.selectionBarColor = "#111"; 
        
        this.clickAreas = []; 
    }

    setData(data) {
        if(!data) return;
        this.items = data.items || [];
        this.categories = data.categories || ["全部"];
        this.scrollY = 0;
    }

    getVisibleItems() {
        if(!this.items) return [];
        let filtered = this.items;
        if (this.currentCategory !== "全部") {
            filtered = filtered.filter(item => item.category === this.currentCategory);
        }
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            filtered = filtered.filter(item => item && item.name && item.name.toLowerCase().includes(q));
        }
        return filtered;
    }

    draw(ctx) {
        const width = this.node.size[0];
        const height = this.node.size[1];
        if (width < 50 || height < 50) return;

        // 1. 绘制自定义区域的背景 (避开顶部的原生Widget区域)
        // 我们从 layoutOffset 开始画背景，这样顶部透出节点原本的颜色
        ctx.fillStyle = this.bgColor;
        ctx.beginPath();
        // 顶部圆角处理
        ctx.roundRect(0, this.layoutOffset - 10, width, height - (this.layoutOffset - 10), 8);
        ctx.fill();

        // 2. 绘制中层：分类 + 搜索
        this.drawControls(ctx, width);

        // 3. 绘制下层：当前选中名称
        this.drawInfoBar(ctx, width);

        // 4. 绘制底层：图片网格
        this.drawGrid(ctx, width, height);

        // 5. 滚动条
        this.drawScrollBar(ctx, width, height);
    }

    drawControls(ctx, width) {
        this.clickAreas = []; // 重置点击区域（重要：每次重绘都要重置）

        const startY = this.layoutOffset;
        const padding = 10;
        const componentH = 28; 

        // 计算布局
        const dropdownW = (width - padding * 3) * 0.35;
        const searchW = (width - padding * 3) * 0.65;
        const searchX = padding + dropdownW + padding;

        // --- A. 下拉菜单 ---
        ctx.fillStyle = this.dropdownBgColor;
        drawRoundedRect(ctx, padding, startY, dropdownW, componentH, 4);

        // 文字
        ctx.fillStyle = "#ccc";
        ctx.font = "12px Arial";
        ctx.textAlign = "left";
        let catText = this.currentCategory;
        if (ctx.measureText(catText).width > dropdownW - 20) {
            catText = catText.substring(0, 6) + "..";
        }
        ctx.fillText(catText, padding + 8, startY + 19);
        // 箭头
        ctx.fillStyle = "#888";
        ctx.font = "10px Arial";
        ctx.fillText("▼", padding + dropdownW - 12, startY + 19);

        // 注册点击
        this.clickAreas.push({
            x: padding, y: startY, w: dropdownW, h: componentH,
            type: 'dropdown'
        });

        // --- B. 搜索框 ---
        ctx.fillStyle = this.searchBgColor;
        drawRoundedRect(ctx, searchX, startY, searchW, componentH, 14);

        // 图标
        ctx.strokeStyle = "#666";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(searchX + 15, startY + 14, 5, 0, Math.PI * 2);
        ctx.stroke();

        // 文字
        ctx.fillStyle = this.searchQuery ? "#fff" : "#666";
        ctx.font = "12px Arial";
        ctx.textAlign = "left";
        const searchText = this.searchQuery || "Search...";
        ctx.fillText(searchText, searchX + 28, startY + 19);

        // 注册点击
        this.clickAreas.push({
            x: searchX, y: startY, w: searchW, h: componentH,
            type: 'search'
        });
    }

    drawInfoBar(ctx, width) {
        const startY = this.layoutOffset + this.controlsHeight; 
        const padding = 10;
        const barH = 28;
        const barW = width - padding * 2;
        
        ctx.fillStyle = this.selectionBarColor;
        drawRoundedRect(ctx, padding, startY, barW, barH, 4);

        // 装饰箭头
        ctx.fillStyle = "#555";
        ctx.font = "12px Arial";
        ctx.textAlign = "left";
        ctx.fillText("◀", padding + 5, startY + 19);
        ctx.textAlign = "right";
        ctx.fillText("▶", padding + barW - 5, startY + 19);

        // 获取当前 Widget 的值
        let currentVal = "未选择模型";
        if (this.node.widgets && this.node.widgets[0]) {
            currentVal = this.node.widgets[0].value;
        }

        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "bold 12px Arial";
        let displayVal = currentVal.split(/[/\\]/).pop();
        if (ctx.measureText(displayVal).width > barW - 40) {
            displayVal = displayVal.substring(0, 30) + "...";
        }
        ctx.fillText(displayVal, width / 2, startY + 19);
    }

    drawGrid(ctx, width, height) {
        const visibleItems = this.getVisibleItems();
        
        // 动态列数
        this.cols = Math.floor((width - this.margin) / 110);
        if (this.cols < 1) this.cols = 1;
        const itemW = (width - this.margin * (this.cols + 1)) / this.cols;
        const itemH = itemW; // 正方形
        
        // 裁剪区域：只在 gridStartY 之下绘制
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, this.gridStartY, width, height - this.gridStartY);
        ctx.clip();

        let x = this.margin;
        let y = this.gridStartY + this.margin - this.scrollY; 

        // 当前选中值
        let currentVal = "";
        if (this.node.widgets && this.node.widgets[0]) {
            currentVal = this.node.widgets[0].value;
        }

        visibleItems.forEach((item, index) => {
            if (index > 0 && index % this.cols === 0) {
                x = this.margin;
                y += itemH + this.margin;
            }

            // 仅绘制可视区域
            if (y + itemH > this.gridStartY && y < height) {
                // 注册点击 (坐标是相对节点的绝对坐标)
                this.clickAreas.push({ x: x, y: y, w: itemW, h: itemH, type: 'item', value: item.name });
                
                // 背景
                ctx.fillStyle = "#333";
                drawRoundedRect(ctx, x, y, itemW, itemH, 6);

                // 选中高亮
                if (currentVal === item.name) {
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = "#4AF"; 
                    ctx.stroke(); 
                }

                // 图片
                if (item.image) {
                    const img = getOrLoadImage(item.image, () => this.node.setDirtyCanvas(true, true));
                    if (img && img.complete && img.naturalWidth > 0) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.roundRect(x, y, itemW, itemH, 6);
                        ctx.clip();
                        this.drawImageCover(ctx, img, x, y, itemW, itemH);
                        ctx.restore();
                    }
                }

                // 底部文字条
                ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
                ctx.beginPath();
                ctx.roundRect(x, y + itemH - 24, itemW, 24, [0, 0, 6, 6]);
                ctx.fill();

                // 文字
                ctx.fillStyle = "#eee";
                ctx.font = "11px Arial";
                ctx.textAlign = "center";
                let name = item.name.split(/[/\\]/).pop();
                if (name.length > 12) name = name.substring(0, 10) + "..";
                ctx.fillText(name, x + itemW/2, y + itemH - 8);
            }
            x += itemW + this.margin;
        });

        // 记录内容总高度
        this.contentHeight = y + itemH + this.margin + this.scrollY - this.gridStartY;
        ctx.restore();
    }

    drawScrollBar(ctx, width, height) {
        const viewH = height - this.gridStartY;
        // 如果内容不够长，不画滚动条
        if (this.contentHeight <= viewH) return;

        const ratio = viewH / this.contentHeight;
        const barH = Math.max(viewH * ratio, 20);
        const scrollRatio = this.scrollY / (this.contentHeight - viewH);
        
        const barY = this.gridStartY + (viewH - barH) * scrollRatio + 2;

        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        drawRoundedRect(ctx, width - 8, barY, 5, barH, 3);
    }

    drawImageCover(ctx, img, x, y, w, h) {
        const imgRatio = img.width / img.height;
        const containerRatio = w / h;
        let dw, dh, dx, dy;
        if (containerRatio > imgRatio) {
            dw = w; dh = w / imgRatio; dx = 0; dy = (h - dh) / 2;
        } else {
            dh = h; dw = h * imgRatio; dy = 0; dx = (w - dw) / 2;
        }
        ctx.drawImage(img, x + dx, y + dy, dw, dh);
    }

    // 滚轮处理：只在内容超长时生效
    handleWheel(delta) {
        const viewH = this.node.size[1] - this.gridStartY;
        // 如果内容高度小于视口，无需滚动
        if (this.contentHeight <= viewH) return false;
        
        this.scrollY += delta * 0.5;
        if (this.scrollY < 0) this.scrollY = 0;
        const maxScroll = this.contentHeight - viewH + 20; // 底部留点余量
        if (this.scrollY > maxScroll) this.scrollY = maxScroll;
        return true; // 返回 true 表示“我消费了这个事件”，阻止画布缩放
    }

    // 点击处理：根据坐标判断是否命中自定义区域
    handleClick(event, x, y) {
        // 反向遍历，优先响应最上层的点击区
        for (let i = this.clickAreas.length - 1; i >= 0; i--) {
            const area = this.clickAreas[i];
            if (x >= area.x && x <= area.x + area.w &&
                y >= area.y && y <= area.y + area.h) {
                
                if (area.type === 'dropdown') {
                    this.showCategoryMenu(event);
                    return true; // 命中 UI，拦截事件
                }
                if (area.type === 'search') {
                    const q = prompt("搜索模型:", this.searchQuery);
                    if (q !== null) {
                        this.searchQuery = q.trim();
                        this.scrollY = 0;
                        this.node.setDirtyCanvas(true, true);
                    }
                    return true;
                }
                if (area.type === 'item') {
                    if (this.node.widgets[0]) {
                        this.node.widgets[0].value = area.value;
                        if (this.node.widgets[0].callback) {
                            this.node.widgets[0].callback(area.value);
                        }
                    }
                    return true;
                }
            }
        }
        // 如果没有命中任何自定义区域，返回 false
        // 这非常重要！返回 false 后，ComfyUI 才会去处理节点的选中和拖拽
        return false;
    }

    showCategoryMenu(event) {
        const options = {
            event: event,
            callback: (value) => {
                this.currentCategory = value;
                this.scrollY = 0;
                this.node.setDirtyCanvas(true, true);
            }
        };
        new LiteGraph.ContextMenu(this.categories, options);
    }
}