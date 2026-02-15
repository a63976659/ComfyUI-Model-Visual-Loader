import { api } from "../../scripts/api.js";

// =========================================================
// 工具函数
// =========================================================
export function normalizePath(path) {
    if (!path) return "";
    return path.replace(/\\/g, '/').toLowerCase();
}

// =========================================================
// 状态管理器
// =========================================================
export class StateManager {
    constructor(nodeId, modelType, savedContext) {
        const safeId = nodeId || "global"; 
        this.prefix = `ComfyVL_${modelType}_${safeId}_`;
        this.savedContext = savedContext;
    }

    // --- 分类 ---
    getInitialCategory() {
        try {
            const val = localStorage.getItem(this.prefix + "Cat");
            if (val) return val;
            if (this.savedContext?.category) return this.savedContext.category;
        } catch (e) {}
        return "全部";
    }

    saveCategory(val) {
        localStorage.setItem(this.prefix + "Cat", val);
        this.saveScroll(0); 
    }

    // --- 搜索 ---
    getInitialSearch() {
        return this.savedContext?.search || "";
    }
    
    saveSearch(val) {
        if (this.savedContext) this.savedContext.search = val;
    }

    // --- 滚动条 ---
    saveScroll(val) {
        localStorage.setItem(this.prefix + "Scroll", val);
    }

    restoreScroll(gridElement) {
        const saved = localStorage.getItem(this.prefix + "Scroll");
        if (!saved) return;
        const target = parseInt(saved);
        if (target <= 0) return;

        const attempt = () => {
            if (gridElement.scrollHeight > gridElement.clientHeight) {
                if (Math.abs(gridElement.scrollTop - target) > 10) {
                    gridElement.scrollTop = target;
                }
            }
        };
        [0, 100, 300, 600].forEach(t => setTimeout(attempt, t));
    }

    // --- 选中项 ---
    getLastSelection() {
        return localStorage.getItem(this.prefix + "Sel");
    }

    saveSelection(val) {
        localStorage.setItem(this.prefix + "Sel", val);
    }
}

// =========================================================
// UI 构建器
// =========================================================
export const UI = {
    createSkeleton(topPadding, isStackMode = false) {
        const container = document.createElement("div");
        container.className = "visual-loader-container";
        container.style.top = `${topPadding}px`;
        container.style.height = `calc(100% - ${topPadding + 10}px)`;

        const header = document.createElement("div");
        header.className = "vl-header";

        const infoBar = document.createElement("div");
        infoBar.className = "vl-info-bar";
        infoBar.innerText = isStackMode ? "点击上方卡片添加" : "未选择模型";

        const grid = document.createElement("div");
        grid.className = "vl-grid";
        if (isStackMode) grid.style.flex = "1";

        let middleBar = null;
        let middleBtns = {};
        if (isStackMode) {
            middleBar = document.createElement("div");
            middleBar.className = "vl-middle-bar";
            middleBtns = this.createFooterButtons(middleBar);
        }

        const footer = document.createElement("div");
        footer.className = "vl-footer";

        container.append(header, infoBar, grid);

        let stackContainer = null;
        if (isStackMode) {
            if (middleBar) container.appendChild(middleBar);
            stackContainer = document.createElement("div");
            stackContainer.className = "vl-stack-container";
            container.appendChild(stackContainer);
        } else {
            container.appendChild(footer);
        }

        return { container, header, infoBar, grid, footer, stackContainer, middleBar, middleBtns };
    },

    createHeaderControls(headerElement) {
        const categorySelect = document.createElement("select");
        categorySelect.className = "vl-select";
        const searchInput = document.createElement("input");
        searchInput.className = "vl-search";
        searchInput.type = "text";
        searchInput.placeholder = "搜索...";
        headerElement.append(categorySelect, searchInput);
        return { categorySelect, searchInput };
    },

    createFooterButtons(parent) {
        const btnView = document.createElement("button");
        btnView.className = "vl-btn";
        btnView.innerText = "查看注释";
        const btnEdit = document.createElement("button");
        btnEdit.className = "vl-btn primary";
        btnEdit.innerText = "修改注释";
        parent.append(btnView, btnEdit);
        return { btnView, btnEdit };
    },

    createCard(item, isSelected, onClick, onImageLoad) {
        const card = document.createElement("div");
        card.className = "vl-card";
        card.dataset.name = item.name;
        if (isSelected) card.classList.add("selected");
        card.onclick = onClick;

        if (item.image) {
            const img = document.createElement("img");
            img.src = item.image;
            img.loading = "lazy";
            if (onImageLoad) img.onload = onImageLoad;
            card.appendChild(img);
        } else {
            const ph = document.createElement("div");
            ph.style.backgroundColor = "#444";
            ph.style.height = "100%";
            card.appendChild(ph);
        }

        const title = document.createElement("div");
        title.className = "vl-card-title";
        title.innerText = item.name.split(/[/\\]/).pop();
        card.appendChild(title);
        return card;
    },

    createStackItem(data, hasClip, onDelete, onChange) {
        const createInput = (val, label, typeKey) => {
            const wrap = document.createElement("div");
            wrap.className = "vl-stack-input-wrap";
            const lbl = document.createElement("span");
            lbl.innerText = label;
            const inp = document.createElement("input");
            inp.type = "number";
            inp.step = "0.1";
            inp.value = (val !== undefined && val !== null) ? val : 1.0;
            inp.className = "vl-stack-input";
            inp.onchange = (e) => onChange(typeKey, parseFloat(e.target.value));
            inp.onkeydown = (e) => e.stopPropagation();
            inp.onwheel = (e) => e.stopPropagation();
            wrap.append(lbl, inp);
            return wrap;
        };

        const delBtn = document.createElement("button");
        delBtn.className = "vl-stack-del";
        delBtn.innerText = "×";
        delBtn.onclick = onDelete;

        const nameDiv = document.createElement("div");
        nameDiv.className = "vl-stack-name";
        nameDiv.innerText = data.name.split(/[/\\]/).pop();
        nameDiv.title = data.name;

        if (!hasClip) {
            // 单行模式
            const row = document.createElement("div");
            row.className = "vl-stack-item";
            const inputsDiv = document.createElement("div");
            inputsDiv.className = "vl-stack-inputs";
            inputsDiv.appendChild(createInput(data.strength_model, "模型强度", "model"));
            row.append(nameDiv, inputsDiv, delBtn);
            return row;
        } else {
            // 双层模式
            const col = document.createElement("div");
            col.className = "vl-stack-item stack-dual";
            const hRow = document.createElement("div");
            hRow.className = "vl-stack-dual-header";
            hRow.append(nameDiv, delBtn);
            const bRow = document.createElement("div");
            bRow.className = "vl-stack-dual-body";
            bRow.append(
                createInput(data.strength_model, "模型强度", "model"),
                createInput(data.strength_clip, "CLIP强度", "clip")
            );
            col.append(hRow, bRow);
            return col;
        }
    },

    showModal(container, title, content, isEditable, onSave) {
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
};

// =========================================================
// VisualAPI - 负责前后端通信
// =========================================================
export const VisualAPI = {
    // 获取模型列表
    async getModels(type) {
        // 后端不需要知道 lora_stack，只知道 lora
        if (type.includes("stack")) type = "lora";
        const res = await api.fetchApi(`/visual_loader/models?type=${type}`);
        return await res.json();
    },

    // 获取注释
    async getNote(type, name) {
        try {
            // 【修正】确保堆叠模式下的类型被转换为 lora
            const apiType = type.includes("stack") ? "lora" : type;
            const res = await api.fetchApi(`/visual_loader/notes?type=${apiType}&name=${encodeURIComponent(name)}`);
            const d = await res.json();
            return d.content || "";
        } catch { return ""; }
    },

    // 保存注释
    async saveNote(type, name, content) {
        const apiType = type.includes("stack") ? "lora" : type;
        const res = await api.fetchApi("/visual_loader/notes", {
            method: "POST",
            body: JSON.stringify({ type: apiType, name, content })
        });
        if (res.status !== 200) throw new Error("Server Error");
    }
};