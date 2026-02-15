import { normalizePath, StateManager, UI, VisualAPI } from "./visual_base.js";

export function createStackWidget(node, modelType, topPadding, savedContext) {
    const isStack = true;
    const hasClip = !modelType.includes("only");
    const state = new StateManager(node.id, modelType, savedContext);

    // 隐藏 Config Widget
    if (node.widgets) {
        setTimeout(() => {
            const w = node.widgets.find(x => x.name === "lora_stack_config");
            if (w) {
                w.type = "hidden"; w.computeSize = () => [0, -4]; w.visible = false; w.draw = () => {};
            }
        }, 10);
    }

    let allItems = [];
    let currentCategory = state.getInitialCategory();
    let searchQuery = state.getInitialSearch();
    
    // 数据源
    let selectedJson = node.widgets?.[0]?.value || "[]";
    let stackData = [];
    try { stackData = JSON.parse(selectedJson); } catch {}
    if (!Array.isArray(stackData)) stackData = [];

    // 预览项
    const savedPreview = state.getLastSelection();
    let currentPreviewModel = savedPreview || (stackData.length > 0 ? stackData[stackData.length-1].name : "");

    // 锁标记：防止内部更新触发重绘
    let isInternalUpdate = false;

    // 构建 UI
    const { container, header, infoBar, grid, stackContainer, middleBtns } = UI.createSkeleton(topPadding, true);
    const { categorySelect, searchInput } = UI.createHeaderControls(header);
    const { btnView, btnEdit } = middleBtns; 

    searchInput.value = searchQuery;

    // --- 逻辑 ---
    function updateStackUI() {
        // 记录当前的滚动位置
        const previousScroll = stackContainer.scrollTop;
        const wasAtBottom = (stackContainer.scrollTop + stackContainer.clientHeight >= stackContainer.scrollHeight - 10);

        stackContainer.innerHTML = "";
        stackData.forEach((item, index) => {
            const el = UI.createStackItem(item, hasClip, 
                () => { // Delete
                    stackData.splice(index, 1);
                    if (stackData.length > 0) {
                        currentPreviewModel = stackData[stackData.length-1].name;
                    } else {
                        currentPreviewModel = "";
                    }
                    saveStack(true);
                    updatePreviewAndState(currentPreviewModel);
                },
                (type, val) => { // Change
                    if (type === 'model') item.strength_model = val;
                    if (type === 'clip') item.strength_clip = val;
                    // 修改数值时不刷新 UI，只保存数据
                    saveStack(false);
                }
            );
            stackContainer.appendChild(el);
        });

        // 智能恢复滚动位置
        if (wasAtBottom) {
             stackContainer.scrollTop = stackContainer.scrollHeight;
        } else {
             stackContainer.scrollTop = previousScroll;
        }
    }

    function updatePreviewAndState(name) {
        currentPreviewModel = name;
        state.saveSelection(name);
        renderGrid();
        updateButtonState();
    }

    function saveStack(refreshUI = true) {
        const str = JSON.stringify(stackData);
        const w = node.widgets.find(x => x.name === "lora_stack_config") || node.widgets[0];
        if (w) {
            w.value = str;
            
            // 【核心修复】加锁 -> 调用回调 -> 解锁
            // 这样 callback 里的逻辑就知道这是内部触发的，不需要重绘 UI
            isInternalUpdate = true;
            if (w.callback) w.callback(str);
            isInternalUpdate = false;
        }
        if (refreshUI) updateStackUI();
    }

    function addToStack(name) {
        stackData.push({ name, strength_model: 1.0, strength_clip: 1.0 });
        saveStack(true);
        // 添加新项目时，确实需要滚动到底部（由 updateStackUI 的 wasAtBottom 逻辑或此处强制处理）
        // 这里手动强制滚一下确保体验
        setTimeout(() => {
            if (stackContainer) stackContainer.scrollTop = stackContainer.scrollHeight;
        }, 0);
        
        updatePreviewAndState(name);
    }

    function updateButtonState() {
        const has = !!currentPreviewModel;
        btnView.disabled = !has;
        btnEdit.disabled = !has;
        infoBar.innerText = has ? `当前选中: ${currentPreviewModel.split(/[/\\]/).pop()}` : "点击卡片添加到列表";
    }

    function renderGrid() {
        grid.innerHTML = "";
        const filtered = allItems.filter(item => {
            const matchCat = currentCategory === "全部" || item.category === currentCategory;
            const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchCat && matchSearch;
        });

        filtered.forEach(item => {
            const isSelected = normalizePath(currentPreviewModel) === normalizePath(item.name);
            const card = UI.createCard(item, isSelected, 
                () => { // Click
                    updatePreviewAndState(item.name); 
                    addToStack(item.name);
                },
                () => state.restoreScroll(grid)
            );
            grid.appendChild(card);
        });
    }

    function updateCategories() {
        const cats = new Set(["全部"]);
        allItems.forEach(i => i.category && cats.add(i.category));
        const sorted = Array.from(cats).sort((a,b)=>a==="全部"?-1:a.localeCompare(b,"zh-CN"));
        
        categorySelect.innerHTML = "";
        let valid = false;
        sorted.forEach(c => {
            const opt = document.createElement("option"); opt.value=c; opt.text=c; categorySelect.appendChild(opt);
            if(c===currentCategory) valid=true;
        });
        
        if(!valid) { 
            currentCategory="全部"; 
            categorySelect.value="全部"; 
            state.saveCategory("全部"); 
        } else {
            categorySelect.value = currentCategory;
        }
    }

    // --- 事件 ---
    categorySelect.onchange = (e) => {
        currentCategory = e.target.value;
        state.saveCategory(currentCategory);
        grid.scrollTop = 0;
        renderGrid();
    };

    let timer;
    grid.onscroll = () => { clearTimeout(timer); timer = setTimeout(() => state.saveScroll(grid.scrollTop), 200); };
    searchInput.oninput = (e) => { searchQuery = e.target.value; state.saveSearch(searchQuery); renderGrid(); };
    searchInput.onkeydown = (e) => e.stopPropagation();

    // 回调劫持
    const wName = "lora_stack_config";
    if (node.widgets) {
        const w = node.widgets.find(x => x.name === wName) || node.widgets[0];
        if (w) {
            const origin = w.callback;
            w.callback = function(v) {
                // 【核心修复】如果是内部更新，直接透传给 ComfyUI，跳过 UI 重绘
                if (isInternalUpdate) {
                    if (origin) origin.apply(this, arguments);
                    return;
                }

                try {
                    // 只有外部更新（加载工作流、粘贴节点）才执行全量重绘
                    const newData = JSON.parse(v);
                    if (Array.isArray(newData)) {
                        stackData = newData;
                        updateStackUI();
                        if (stackData.length > 0 && !currentPreviewModel) {
                            currentPreviewModel = stackData[stackData.length-1].name;
                        }
                        renderGrid();
                        updateButtonState();
                    }
                } catch {}
                if (origin) origin.apply(this, arguments);
            };
        }
    }

    // 注释
    btnView.onclick = async () => {
        if (!currentPreviewModel) return;
        const c = await VisualAPI.getNote(isStack?"lora":modelType, currentPreviewModel);
        UI.showModal(container, "查看: " + currentPreviewModel, c || "无注释", false);
    };
    btnEdit.onclick = async () => {
        if (!currentPreviewModel) return;
        const c = await VisualAPI.getNote(isStack?"lora":modelType, currentPreviewModel);
        UI.showModal(container, "编辑: " + currentPreviewModel, c, true, async (val) => {
            try { await VisualAPI.saveNote(isStack?"lora":modelType, currentPreviewModel, val); } catch { alert("失败"); }
        });
    };

    // 初始化
    const apiType = "lora"; 
    VisualAPI.getModels(apiType).then(data => {
        allItems = data;
        updateCategories(); 

        const w = node.widgets.find(x => x.name === "lora_stack_config") || node.widgets[0];
        if (w && w.value) {
            try {
                stackData = JSON.parse(w.value);
                // 初始化时不需要判断 isInternalUpdate，因为必须渲染出来
                updateStackUI();
            } catch {}
        }
        
        renderGrid();
        updateButtonState();
        state.restoreScroll(grid);
    });

    return { widget: container };
}