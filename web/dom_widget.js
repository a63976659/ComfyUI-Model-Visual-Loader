import { api } from "../../scripts/api.js";
import { StateManager } from "./state_manager.js";
import { UI } from "./ui_builder.js";

console.log("%c [VisualLoader] V2.2 Fixes ", "background: #222; color: #bada55");

export function createVisualWidget(node, modelType, topPadding, savedContext) {
    const isStack = modelType.includes("stack");
    const hasClip = !modelType.includes("only");

    // =========================================================
    // 【修复2】彻底隐藏 lora_stack_config 组件
    // =========================================================
    if (isStack && node.widgets) {
        // 延时一帧执行，确保节点初始化完毕
        setTimeout(() => {
            const configWidget = node.widgets.find(w => w.name === "lora_stack_config");
            if (configWidget) {
                configWidget.type = "hidden"; 
                configWidget.computeSize = () => [0, -4]; // 强制尺寸为0
                configWidget.visible = false;
                // 暴力覆盖绘制方法，确保完全不渲染
                configWidget.draw = function() {}; 
            }
        }, 10);
    }

    // 1. 初始化状态
    const state = new StateManager(modelType, savedContext);
    let allItems = [];
    let currentCategory = state.getInitialCategory();
    let searchQuery = state.getInitialSearch();
    
    // 状态
    let selectedValue = node.widgets?.[0]?.value || (isStack ? "[]" : "");
    let currentPreviewModel = ""; 

    let stackData = isStack ? parseStack(selectedValue) : [];

    // 2. 构建 UI
    const { container, header, infoBar, grid, footer, stackContainer, middleBar, middleBtns } = UI.createSkeleton(topPadding, isStack);
    const { categorySelect, searchInput } = UI.createHeaderControls(header);
    
    let btnView, btnEdit;
    if (isStack) {
        btnView = middleBtns.btnView;
        btnEdit = middleBtns.btnEdit;
    } else {
        const btns = UI.createFooterButtons(footer);
        btnView = btns.btnView;
        btnEdit = btns.btnEdit;
    }

    searchInput.value = searchQuery;

    // =========================================================
    // 堆叠模式逻辑 (修复列表跳动问题)
    // =========================================================

    function parseStack(jsonStr) {
        try {
            const res = JSON.parse(jsonStr);
            return Array.isArray(res) ? res : [];
        } catch (e) { return []; }
    }

    function updateStackUI() {
        if (!stackContainer) return;
        stackContainer.innerHTML = "";
        
        stackData.forEach((item, index) => {
            const el = UI.createStackItem(
                item, 
                hasClip,
                // OnDelete (删除需要重绘)
                () => {
                    stackData.splice(index, 1);
                    saveStack(true); // true = 重绘 UI
                },
                // OnChange (修改数值不需要重绘，防止跳动)
                (type, val) => {
                    if (type === 'model') item.strength_model = val;
                    if (type === 'clip') item.strength_clip = val;
                    // 只保存数据，不刷新界面
                    saveStack(false); 
                }
            );
            stackContainer.appendChild(el);
        });
        // 只有重绘时才滚动到底部
        stackContainer.scrollTop = stackContainer.scrollHeight;
    }

    // 【修复3】增加 shouldUpdateUI 参数
    function saveStack(shouldUpdateUI = true) {
        const jsonStr = JSON.stringify(stackData);
        
        let targetWidget;
        if (isStack) {
            targetWidget = node.widgets.find(w => w.name === "lora_stack_config");
        } else {
            targetWidget = node.widgets[0];
        }

        if (targetWidget) {
            targetWidget.value = jsonStr;
            if (targetWidget.callback) targetWidget.callback(jsonStr);
        }

        if (shouldUpdateUI) {
            updateStackUI();
        }
    }

    function addToStack(name) {
        // 【修复1】确保 strength_clip 有默认值
        stackData.push({
            name: name,
            strength_model: 1.0,
            strength_clip: 1.0 
        });
        saveStack(true); // 添加新项需要重绘
    }

    // =========================================================
    // 通用交互逻辑
    // =========================================================

    function updateButtonState() {
        const target = isStack ? currentPreviewModel : selectedValue;
        const hasSelection = !!target;
        if (btnView) btnView.disabled = !hasSelection;
        if (btnEdit) btnEdit.disabled = !hasSelection;
        
        if (isStack) {
            infoBar.innerText = hasSelection ? `当前选中: ${target.split(/[/\\]/).pop()} (点击添加)` : "点击卡片添加到列表";
        }
    }
    updateButtonState();

    function syncSelection(val) {
        if (isStack) {
            // 外部加载数据时，重绘一次
            stackData = parseStack(val);
            updateStackUI();
        } else {
            selectedValue = val;
            infoBar.innerText = val ? val.split(/[/\\]/).pop() : "未选择模型";
            highlightCard(val);
            updateButtonState();
        }
    }

    function highlightCard(name) {
        const cards = grid.querySelectorAll(".vl-card");
        cards.forEach(card => {
            if (card.dataset.name === name) card.classList.add("selected");
            else card.classList.remove("selected");
        });
    }

    // 劫持 Widget 回调
    const targetWidgetName = isStack ? "lora_stack_config" : (node.widgets[0] ? node.widgets[0].name : null);
    
    if (targetWidgetName && node.widgets) {
        const w = node.widgets.find(x => x.name === targetWidgetName);
        if (w) {
            const originalCallback = w.callback;
            w.callback = function(v) {
                syncSelection(v);
                if (originalCallback) return originalCallback.apply(this, arguments);
            };
        }
    }

    function renderGrid() {
        grid.innerHTML = ""; 
        const filtered = allItems.filter(item => {
            const matchCat = currentCategory === "全部" || item.category === currentCategory;
            const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchCat && matchSearch;
        });

        filtered.forEach(item => {
            const isSelected = isStack ? (currentPreviewModel === item.name) : (selectedValue === item.name);

            const card = UI.createCard(
                item, 
                isSelected,
                () => {
                    if (isStack) {
                        currentPreviewModel = item.name;
                        highlightCard(item.name); 
                        updateButtonState(); 
                        addToStack(item.name);
                    } else {
                        if (node.widgets?.[0]) {
                            node.widgets[0].value = item.name;
                            node.widgets[0].callback?.(item.name);
                        }
                    }
                },
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

        if (isCurrentValid) categorySelect.value = currentCategory;
        else {
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
        grid.scrollTop = 0;
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
        const targetName = isStack ? currentPreviewModel : selectedValue;
        if (!targetName) return "";
        try {
            const r = await api.fetchApi(`/visual_loader/notes?type=${modelType}&name=${encodeURIComponent(targetName)}`);
            const d = await r.json();
            return d.content || "";
        } catch(e) { return "读取失败"; }
    }
    
    if (btnView) {
        btnView.onclick = async () => {
            const targetName = isStack ? currentPreviewModel : selectedValue;
            if (!targetName) return;
            const c = await getNote();
            UI.showModal(container, "查看: " + targetName.split(/[/\\]/).pop(), c || "无注释", false);
        };
    }

    if (btnEdit) {
        btnEdit.onclick = async () => {
            const targetName = isStack ? currentPreviewModel : selectedValue;
            if (!targetName) return;
            const c = await getNote();
            UI.showModal(container, "编辑: " + targetName.split(/[/\\]/).pop(), c, true, async (val) => {
                try {
                    await api.fetchApi("/visual_loader/notes", {
                        method: "POST",
                        body: JSON.stringify({ type: modelType, name: targetName, content: val })
                    });
                } catch(e) { alert("保存失败"); }
            });
        };
    }

    // 启动数据加载
    const apiType = isStack ? "lora" : modelType;

    api.fetchApi(`/visual_loader/models?type=${apiType}`)
        .then(res => res.json())
        .then(data => {
            allItems = data;
            updateCategories(data);
            renderGrid();
            
            if (isStack) {
                // 恢复堆叠数据
                const w = node.widgets.find(x => x.name === "lora_stack_config");
                if (w && w.value) {
                    stackData = parseStack(w.value);
                    updateStackUI();
                }
            } else {
                if (selectedValue) syncSelection(selectedValue);
            }
            state.restoreScroll(grid);
        });

    return { widget: container };
}