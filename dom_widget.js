import { api } from "../../scripts/api.js";
import { app } from "../../scripts/app.js";

// 【调试标记】如果你在控制台(F12)看不到这句话，说明浏览器缓存没清理，请 Ctrl+F5 刷新
console.log("%c [VisualLoader] JS Loaded - V2026 ", "background: #222; color: #bada55");

export function createVisualWidget(node, modelType, topPadding, savedContext) {
    // 1. 创建 UI 容器
    const container = document.createElement("div");
    container.className = "visual-loader-container";
    container.style.top = `${topPadding}px`;
    container.style.height = `calc(100% - ${topPadding + 10}px)`;

    // --- Header ---
    const header = document.createElement("div");
    header.className = "vl-header";

    const categorySelect = document.createElement("select");
    categorySelect.className = "vl-select";
    
    const searchInput = document.createElement("input");
    searchInput.className = "vl-search";
    searchInput.type = "text";
    searchInput.placeholder = "搜索...";

    header.appendChild(categorySelect);
    header.appendChild(searchInput);

    // --- Info Bar ---
    const infoBar = document.createElement("div");
    infoBar.className = "vl-info-bar";
    infoBar.innerText = "未选择模型";

    // --- Grid (列表) ---
    const grid = document.createElement("div");
    grid.className = "vl-grid";

    // --- Footer ---
    const footer = document.createElement("div");
    footer.className = "vl-footer";
    const btnView = document.createElement("button");
    btnView.className = "vl-btn";
    btnView.innerText = "查看注释"; 
    const btnEdit = document.createElement("button");
    btnEdit.className = "vl-btn primary";
    btnEdit.innerText = "修改注释";
    footer.appendChild(btnView);
    footer.appendChild(btnEdit);

    container.appendChild(header);
    container.appendChild(infoBar);
    container.appendChild(grid);
    container.appendChild(footer);

    // =========================================================
    // 状态管理 (LocalStorage)
    // =========================================================
    const KEY_CAT = `ComfyVL_${modelType}_Cat`;
    const KEY_SCROLL = `ComfyVL_${modelType}_Scroll`;

    // 读取缓存 (优先 localStorage > savedContext > "全部")
    let currentCategory = "全部";
    try {
        const localCat = localStorage.getItem(KEY_CAT);
        if (localCat) currentCategory = localCat;
        else if (savedContext?.category) currentCategory = savedContext.category;
    } catch (e) {}

    let searchQuery = savedContext?.search || "";
    // 安全获取 widget 值
    let selectedModelName = "";
    if (node.widgets && node.widgets[0]) {
        selectedModelName = node.widgets[0].value;
    }

    searchInput.value = searchQuery;

    // 数据容器
    let allItems = [];

    // =========================================================
    // 核心逻辑函数
    // =========================================================

    function updateButtonState() {
        const hasSelection = !!selectedModelName;
        btnView.disabled = !hasSelection;
        btnEdit.disabled = !hasSelection;
    }
    // 初始化按钮状态
    updateButtonState();

    function syncSelection(name) {
        selectedModelName = name;
        infoBar.innerText = name ? name.split(/[/\\]/).pop() : "未选择模型";
        
        const cards = grid.querySelectorAll(".vl-card");
        cards.forEach(card => {
            if (card.dataset.name === name) card.classList.add("selected");
            else card.classList.remove("selected");
        });
        updateButtonState();
    }

    // 劫持 Widget 回调
    if (node.widgets && node.widgets[0]) {
        const mainWidget = node.widgets[0];
        const originalCallback = mainWidget.callback;
        mainWidget.callback = function(v) {
            syncSelection(v);
            if (originalCallback) return originalCallback.apply(this, arguments);
        };
    }

    function renderGrid() {
        grid.innerHTML = ""; 
        const filtered = allItems.filter(item => {
            const matchCat = currentCategory === "全部" || item.category === currentCategory;
            const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchCat && matchSearch;
        });

        filtered.forEach(item => {
            const card = document.createElement("div");
            card.className = "vl-card";
            card.dataset.name = item.name;

            if (selectedModelName === item.name) card.classList.add("selected");

            card.onclick = () => {
                if (node.widgets && node.widgets[0]) {
                    node.widgets[0].value = item.name;
                    if (node.widgets[0].callback) node.widgets[0].callback(item.name);
                }
            };

            if (item.image) {
                const img = document.createElement("img");
                img.src = item.image;
                img.loading = "lazy";
                // 【关键优化】图片加载完成后，如果发现需要恢复滚动，再尝试一次
                img.onload = () => restoreScrollPosition(false); 
                card.appendChild(img);
            } else {
                const placeholder = document.createElement("div");
                placeholder.style.backgroundColor = "#444";
                placeholder.style.height = "100%";
                card.appendChild(placeholder);
            }

            const title = document.createElement("div");
            title.className = "vl-card-title";
            title.innerText = item.name.split(/[/\\]/).pop();
            card.appendChild(title);

            grid.appendChild(card);
        });
    }

    function updateCategories(items) {
        const categories = new Set(["全部"]);
        items.forEach(i => i.category && categories.add(i.category));
        
        const sortedCats = Array.from(categories).sort((a, b) => {
            if (a === "全部") return -1;
            if (b === "全部") return 1;
            return a.localeCompare(b, "zh-CN");
        });

        categorySelect.innerHTML = "";
        let isCurrentValid = false;

        sortedCats.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.text = cat;
            categorySelect.appendChild(opt);
            if (cat === currentCategory) isCurrentValid = true;
        });

        // 如果之前的文件夹不见了，重置为全部
        if (isCurrentValid) {
            categorySelect.value = currentCategory;
        } else {
            currentCategory = "全部";
            categorySelect.value = "全部";
        }
    }

    // --- 滚动条恢复逻辑 (多重保障) ---
    function restoreScrollPosition(force = false) {
        const savedScroll = localStorage.getItem(KEY_SCROLL);
        if (!savedScroll) return;

        const target = parseInt(savedScroll);
        if (target <= 0) return;

        // 如果当前内容高度足以支持滚动
        if (grid.scrollHeight > grid.clientHeight) {
            if (Math.abs(grid.scrollTop - target) > 10) {
                grid.scrollTop = target;
            }
        }
    }

    // =========================================================
    // 事件监听
    // =========================================================

    categorySelect.addEventListener("change", (e) => {
        currentCategory = e.target.value;
        if (savedContext) savedContext.category = currentCategory;
        localStorage.setItem(KEY_CAT, currentCategory);
        
        // 切换分类归零滚动条
        grid.scrollTop = 0;
        localStorage.setItem(KEY_SCROLL, 0);
        renderGrid();
    });

    let scrollTimer;
    grid.addEventListener("scroll", (e) => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            localStorage.setItem(KEY_SCROLL, grid.scrollTop);
        }, 200);
    });

    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        if (savedContext) savedContext.search = searchQuery;
        renderGrid();
    });
    searchInput.addEventListener("keydown", (e) => e.stopPropagation()); 

    // =========================================================
    // 注释弹窗功能
    // =========================================================
    function showModal(title, content, isEditable, onSave) {
        const overlay = document.createElement("div");
        overlay.className = "vl-modal-overlay";
        const modal = document.createElement("div");
        modal.className = "vl-modal";
        
        const h = document.createElement("div");
        h.className = "vl-modal-header";
        h.innerText = title;
        
        const txt = document.createElement("textarea");
        txt.className = "vl-modal-text";
        txt.value = content;
        txt.readOnly = !isEditable;
        
        const acts = document.createElement("div");
        acts.className = "vl-modal-actions";
        
        const cls = document.createElement("button");
        cls.className = "vl-btn";
        cls.innerText = "关闭";
        cls.onclick = () => overlay.remove();
        acts.appendChild(cls);

        if (isEditable) {
            const save = document.createElement("button");
            save.className = "vl-btn primary";
            save.innerText = "保存";
            save.onclick = async () => { await onSave(txt.value); overlay.remove(); };
            acts.appendChild(save);
        }
        
        modal.append(h, txt, acts);
        overlay.appendChild(modal);
        container.appendChild(overlay);
    }

    async function getNote() {
        try {
            const r = await api.fetchApi(`/visual_loader/notes?type=${modelType}&name=${encodeURIComponent(selectedModelName)}`);
            const d = await r.json();
            return d.content || "";
        } catch(e) { return "读取失败"; }
    }

    btnView.onclick = async () => {
        if (!selectedModelName) return;
        const c = await getNote();
        showModal("查看: " + selectedModelName, c || "无注释", false);
    };

    btnEdit.onclick = async () => {
        if (!selectedModelName) return;
        const c = await getNote();
        showModal("编辑: " + selectedModelName, c, true, async (val) => {
             try {
                await api.fetchApi("/visual_loader/notes", {
                    method: "POST",
                    body: JSON.stringify({ type: modelType, name: selectedModelName, content: val })
                });
             } catch(e) { alert("保存失败"); }
        });
    };

    // =========================================================
    // 启动加载
    // =========================================================
    api.fetchApi(`/visual_loader/models?type=${modelType}`)
        .then(res => res.json())
        .then(data => {
            allItems = data;
            updateCategories(data);
            renderGrid();
            if (selectedModelName) syncSelection(selectedModelName);

            // 尝试恢复滚动 (多次尝试以应对渲染延迟)
            setTimeout(() => restoreScrollPosition(true), 100);
            setTimeout(() => restoreScrollPosition(true), 500);
        })
        .catch(err => {
            console.error(err);
            infoBar.innerText = "加载失败: " + err.message;
        });

    return { widget: container };
}