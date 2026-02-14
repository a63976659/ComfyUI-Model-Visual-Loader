// dom_widget.js
import { api } from "../../scripts/api.js";
import { StateManager } from "./state_manager.js";
import { UI } from "./ui_builder.js";

console.log("%c [VisualLoader] Modular JS Loaded ", "background: #222; color: #bada55");

export function createVisualWidget(node, modelType, topPadding, savedContext) {
    // 1. 初始化状态管理
    const state = new StateManager(modelType, savedContext);
    let allItems = [];
    let currentCategory = state.getInitialCategory();
    let searchQuery = state.getInitialSearch();
    let selectedModelName = node.widgets?.[0]?.value || "";

    // 2. 构建 UI 骨架
    const { container, header, infoBar, grid, footer } = UI.createSkeleton(topPadding);
    const { categorySelect, searchInput } = UI.createHeaderControls(header);
    const { btnView, btnEdit } = UI.createFooterButtons(footer);

    // 恢复搜索框值
    searchInput.value = searchQuery;

    // =========================================================
    // 业务逻辑方法
    // =========================================================

    function updateButtonState() {
        const hasSelection = !!selectedModelName;
        btnView.disabled = !hasSelection;
        btnEdit.disabled = !hasSelection;
    }
    updateButtonState();

    function syncSelection(name) {
        selectedModelName = name;
        infoBar.innerText = name ? name.split(/[/\\]/).pop() : "未选择模型";
        
        // 更新高亮
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
            const card = UI.createCard(
                item, 
                selectedModelName === item.name,
                // 点击回调
                () => {
                    if (node.widgets?.[0]) {
                        node.widgets[0].value = item.name;
                        node.widgets[0].callback?.(item.name);
                    }
                },
                // 图片加载回调 (用于触发滚动恢复)
                () => state.restoreScroll(grid)
            );
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

        if (isCurrentValid) {
            categorySelect.value = currentCategory;
        } else {
            currentCategory = "全部";
            categorySelect.value = "全部";
            state.saveCategory("全部");
        }
    }

    // =========================================================
    // 事件监听
    // =========================================================

    categorySelect.addEventListener("change", (e) => {
        currentCategory = e.target.value;
        state.saveCategory(currentCategory);
        grid.scrollTop = 0; // 切换分类强制回顶
        renderGrid();
    });

    let scrollTimer;
    grid.addEventListener("scroll", () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            state.saveScroll(grid.scrollTop);
        }, 200);
    });

    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        state.saveSearch(searchQuery);
        renderGrid();
    });
    searchInput.addEventListener("keydown", (e) => e.stopPropagation());

    // 注释功能
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
        UI.showModal(container, "查看: " + selectedModelName, c || "无注释", false);
    };

    btnEdit.onclick = async () => {
        if (!selectedModelName) return;
        const c = await getNote();
        UI.showModal(container, "编辑: " + selectedModelName, c, true, async (val) => {
             try {
                await api.fetchApi("/visual_loader/notes", {
                    method: "POST",
                    body: JSON.stringify({ type: modelType, name: selectedModelName, content: val })
                });
             } catch(e) { alert("保存失败"); }
        });
    };

    // =========================================================
    // 启动数据加载
    // =========================================================
    api.fetchApi(`/visual_loader/models?type=${modelType}`)
        .then(res => res.json())
        .then(data => {
            allItems = data;
            updateCategories(data);
            renderGrid();
            if (selectedModelName) syncSelection(selectedModelName);
            
            // 初始滚动恢复
            state.restoreScroll(grid);
        })
        .catch(err => {
            console.error(err);
            infoBar.innerText = "加载失败: " + err.message;
        });

    return { widget: container };
}