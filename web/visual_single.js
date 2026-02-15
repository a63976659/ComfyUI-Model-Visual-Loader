import { normalizePath, StateManager, UI, VisualAPI } from "./visual_base.js";

export function createSingleWidget(node, modelType, topPadding, savedContext) {
    const state = new StateManager(node.id, modelType, savedContext);
    
    // 【关键修复 step 1】
    // 在一开始就死死锁住 LocalStorage 里的值，存为“真理值”
    // 这个值绝对不能被后续 ComfyUI 的 callback 污染
    const TRUTH_VALUE = state.getLastSelection(); 
    
    // 如果本地有值，优先用本地的；否则用 ComfyUI 传来的
    let selectedValue = TRUTH_VALUE || (node.widgets?.[0]?.value || "");
    
    let allItems = [];
    let currentCategory = state.getInitialCategory();
    let searchQuery = state.getInitialSearch();
    let isInitializing = true; // 增加初始化标记

    // 构建 UI
    const { container, header, infoBar, grid, footer, middleBtns } = UI.createSkeleton(topPadding, false);
    const { categorySelect, searchInput } = UI.createHeaderControls(header);
    const { btnView, btnEdit } = UI.createFooterButtons(footer);

    searchInput.value = searchQuery;

    // --- 逻辑函数 ---

    function updateButtonState() {
        const hasSelection = !!selectedValue;
        btnView.disabled = !hasSelection;
        btnEdit.disabled = !hasSelection;
    }

    function highlightCard(name) {
        if (!name) return;
        const target = normalizePath(name);
        grid.querySelectorAll(".vl-card").forEach(card => {
            if (normalizePath(card.dataset.name) === target) card.classList.add("selected");
            else card.classList.remove("selected");
        });
    }

    function syncSelection(val) {
        selectedValue = val;
        infoBar.innerText = val ? val.split(/[/\\]/).pop() : "未选择模型";
        highlightCard(val);
        updateButtonState();
    }

    function renderGrid() {
        grid.innerHTML = "";
        const filtered = allItems.filter(item => {
            const matchCat = currentCategory === "全部" || item.category === currentCategory;
            const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchCat && matchSearch;
        });

        filtered.forEach(item => {
            const isSelected = normalizePath(selectedValue) === normalizePath(item.name);
            const card = UI.createCard(item, isSelected, 
                // OnClick
                () => {
                    const name = item.name;
                    // 1. 更新 Widget
                    if (node.widgets?.[0]) {
                        node.widgets[0].value = name;
                        if (node.widgets[0].callback) node.widgets[0].callback(name);
                    }
                    
                    // 2. 立即保存状态 (这是最权威的操作)
                    state.saveSelection(name);
                    
                    // 3. 顺便保存分类
                    if (item.category) {
                         currentCategory = item.category;
                         categorySelect.value = currentCategory;
                         state.saveCategory(currentCategory);
                    }
                    
                    // 4. 手动同步视觉 (防止 callback 延迟)
                    syncSelection(name);
                },
                () => state.restoreScroll(grid)
            );
            grid.appendChild(card);
        });
    }

    function updateCategories() {
        const cats = new Set(["全部"]);
        allItems.forEach(i => i.category && cats.add(i.category));
        const sorted = Array.from(cats).sort((a, b) => a === "全部" ? -1 : a.localeCompare(b, "zh-CN"));
        
        categorySelect.innerHTML = "";
        let valid = false;
        sorted.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c; opt.text = c;
            categorySelect.appendChild(opt);
            if (c === currentCategory) valid = true;
        });
        if (!valid) {
            currentCategory = "全部";
            categorySelect.value = "全部";
            state.saveCategory("全部");
        } else {
            categorySelect.value = currentCategory;
        }
    }

    // --- 事件监听 ---
    categorySelect.onchange = (e) => {
        currentCategory = e.target.value;
        state.saveCategory(currentCategory);
        grid.scrollTop = 0;
        renderGrid();
    };

    let timer;
    grid.onscroll = () => {
        clearTimeout(timer);
        timer = setTimeout(() => state.saveScroll(grid.scrollTop), 200);
    };

    searchInput.oninput = (e) => {
        searchQuery = e.target.value;
        state.saveSearch(searchQuery);
        renderGrid();
    };
    searchInput.onkeydown = (e) => e.stopPropagation();

    // =========================================================
    // 【关键修复 step 2】 智能劫持 Callback
    // =========================================================
    if (node.widgets && node.widgets[0]) {
        const w = node.widgets[0];
        const origin = w.callback;
        w.callback = function(v) {
            // 如果处于初始化阶段，且传入的值(v) 与我们记录的真理值(TRUTH_VALUE) 不一致
            // 说明这是 ComfyUI 在用旧数据覆盖我们，必须拦截！
            if (isInitializing && TRUTH_VALUE && normalizePath(v) !== normalizePath(TRUTH_VALUE)) {
                console.log(`[VisualLoader] 拦截到旧数据覆盖: ${v}, 强制保持: ${TRUTH_VALUE}`);
                // 此时不仅不更新 UI，还要把 Widget 的值改回真理值
                if (node.widgets[0].value !== TRUTH_VALUE) {
                    node.widgets[0].value = TRUTH_VALUE;
                }
                return; // 拒绝执行后续逻辑
            }

            // 正常操作：用户手动修改，或初始化完成后的更新
            state.saveSelection(v);
            syncSelection(v);
            if (origin) origin.apply(this, arguments);
        };
    }

    // 注释功能
    btnView.onclick = async () => {
        if (!selectedValue) return;
        const c = await VisualAPI.getNote(modelType, selectedValue);
        UI.showModal(container, "查看: " + selectedValue.split(/[/\\]/).pop(), c || "无注释", false);
    };
    btnEdit.onclick = async () => {
        if (!selectedValue) return;
        const c = await VisualAPI.getNote(modelType, selectedValue);
        UI.showModal(container, "编辑: " + selectedValue.split(/[/\\]/).pop(), c, true, async (val) => {
            try { await VisualAPI.saveNote(modelType, selectedValue, val); } 
            catch { alert("保存失败"); }
        });
    };

    // 初始化数据加载
    VisualAPI.getModels(modelType).then(data => {
        allItems = data;
        updateCategories();
        
        // 【关键修复 step 3】数据加载完后，再次强制应用真理值
        if (TRUTH_VALUE) {
            syncSelection(TRUTH_VALUE);
            // 确保 ComfyUI 节点内部值也是对的
            if (node.widgets?.[0]) {
                node.widgets[0].value = TRUTH_VALUE;
            }
        }
        
        renderGrid();
        state.restoreScroll(grid);
        
        // 稍微延迟一点解除“初始化锁定”，防止 ComfyUI 还有后续的加载动作
        setTimeout(() => {
            isInitializing = false;
        }, 500);
    });

    return { widget: container };
}