import { api } from "../../scripts/api.js";
import { app } from "../../scripts/app.js";

export function createVisualWidget(node, modelType, topPadding, savedContext) {
    const container = document.createElement("div");
    container.className = "visual-loader-container";
    container.style.top = `${topPadding}px`;
    container.style.height = `calc(100% - ${topPadding + 10}px)`;

    // --- Header ---
    const header = document.createElement("div");
    header.className = "vl-header";

    const categorySelect = document.createElement("select");
    categorySelect.className = "vl-select";
    const optAll = document.createElement("option");
    optAll.value = "全部";
    optAll.text = "全部";
    categorySelect.appendChild(optAll);

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

    // --- Grid ---
    const grid = document.createElement("div");
    grid.className = "vl-grid";

    // --- Footer ---
    const footer = document.createElement("div");
    footer.className = "vl-footer";

    const btnView = document.createElement("button");
    btnView.className = "vl-btn";
    btnView.innerText = "查看注释";
    btnView.disabled = true;

    const btnEdit = document.createElement("button");
    btnEdit.className = "vl-btn primary";
    btnEdit.innerText = "修改注释";
    btnEdit.disabled = true;

    footer.appendChild(btnView);
    footer.appendChild(btnEdit);

    container.appendChild(header);
    container.appendChild(infoBar);
    container.appendChild(grid);
    container.appendChild(footer);

    // --- 状态逻辑 ---
    let allItems = [];
    let currentCategory = savedContext?.category || "全部";
    let searchQuery = savedContext?.search || "";
    let selectedModelName = node.widgets[0].value || "";

    searchInput.value = searchQuery;

    function updateButtonState() {
        const hasSelection = !!selectedModelName;
        btnView.disabled = !hasSelection;
        btnEdit.disabled = !hasSelection;
    }

    // --- 【核心修改】同步视觉状态函数 ---
    function syncSelection(name) {
        selectedModelName = name;
        infoBar.innerText = name ? name.split(/[/\\]/).pop() : "未选择模型";
        
        // 更新卡片选中样式
        const cards = grid.querySelectorAll(".vl-card");
        cards.forEach(card => {
            if (card.dataset.name === name) {
                card.classList.add("selected");
            } else {
                card.classList.remove("selected");
            }
        });
        updateButtonState();
    }

    // --- 【核心修改】劫持 Widget Callback ---
    const mainWidget = node.widgets[0];
    const originalCallback = mainWidget.callback;
    mainWidget.callback = function(v) {
        syncSelection(v);
        if (originalCallback) return originalCallback.apply(this, arguments);
    };

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
            card.dataset.name = item.name; // 绑定名称

            if (selectedModelName === item.name) {
                card.classList.add("selected");
            }

            card.onclick = () => {
                // 点击卡片直接通过 widget 触发逻辑，callback 会自动处理同步
                mainWidget.value = item.name;
                if (mainWidget.callback) mainWidget.callback(item.name);
            };

            if (item.image) {
                const img = document.createElement("img");
                img.src = item.image;
                img.loading = "lazy";
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
        sortedCats.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.text = cat;
            categorySelect.appendChild(opt);
        });
        categorySelect.value = currentCategory;
    }

    // --- 注释功能 ---
    function showModal(title, content, isEditable, onSave) {
        const modalOverlay = document.createElement("div");
        modalOverlay.className = "vl-modal-overlay";
        const modal = document.createElement("div");
        modal.className = "vl-modal";
        const header = document.createElement("div");
        header.className = "vl-modal-header";
        header.innerText = title;
        const textarea = document.createElement("textarea");
        textarea.className = "vl-modal-text";
        textarea.value = content;
        textarea.readOnly = !isEditable;
        const actions = document.createElement("div");
        actions.className = "vl-modal-actions";
        const btnClose = document.createElement("button");
        btnClose.className = "vl-btn";
        btnClose.innerText = "关闭";
        btnClose.onclick = () => container.removeChild(modalOverlay);
        actions.appendChild(btnClose);

        if (isEditable) {
            const btnSave = document.createElement("button");
            btnSave.className = "vl-btn primary";
            btnSave.innerText = "保存";
            btnSave.onclick = async () => {
                await onSave(textarea.value);
                container.removeChild(modalOverlay);
            };
            actions.appendChild(btnSave);
        }
        modal.appendChild(header);
        modal.appendChild(textarea);
        modal.appendChild(actions);
        modalOverlay.appendChild(modal);
        container.appendChild(modalOverlay);
    }

    async function fetchNoteContent() {
        try {
            const res = await api.fetchApi(`/visual_loader/notes?type=${modelType}&name=${encodeURIComponent(selectedModelName)}`);
            const data = await res.json();
            return data.content || "";
        } catch (e) { return "获取注释失败"; }
    }

    btnView.onclick = async () => {
        if (!selectedModelName) return;
        const content = await fetchNoteContent();
        showModal(`查看注释: ${selectedModelName.split(/[/\\]/).pop()}`, content || "(暂无注释)", false);
    };

    btnEdit.onclick = async () => {
        if (!selectedModelName) return;
        const content = await fetchNoteContent();
        showModal(`编辑注释: ${selectedModelName.split(/[/\\]/).pop()}`, content, true, async (newContent) => {
            try {
                await api.fetchApi("/visual_loader/notes", {
                    method: "POST",
                    body: JSON.stringify({ type: modelType, name: selectedModelName, content: newContent })
                });
            } catch (e) { alert("保存失败: " + e); }
        });
    };

    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        if (savedContext) savedContext.search = searchQuery;
        renderGrid();
    });
    searchInput.addEventListener("keydown", (e) => e.stopPropagation()); 
    categorySelect.addEventListener("change", (e) => {
        currentCategory = e.target.value;
        if (savedContext) savedContext.category = currentCategory;
        renderGrid();
    });

    api.fetchApi(`/visual_loader/models?type=${modelType}`)
        .then(res => res.json())
        .then(data => {
            allItems = data;
            updateCategories(data);
            renderGrid();
            // 初始对齐
            if(mainWidget.value) syncSelection(mainWidget.value);
        });

    return { widget: container };
}