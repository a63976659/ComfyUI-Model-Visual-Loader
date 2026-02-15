export const UI = {
    // 创建基础骨架
    createSkeleton(topPadding, isStackMode = false) {
        const container = document.createElement("div");
        container.className = "visual-loader-container";
        container.style.top = `${topPadding}px`;
        container.style.height = `calc(100% - ${topPadding + 10}px)`;

        // 1. 顶部
        const header = document.createElement("div");
        header.className = "vl-header";

        // 2. 信息条
        const infoBar = document.createElement("div");
        infoBar.className = "vl-info-bar";
        infoBar.innerText = isStackMode ? "点击上方卡片添加" : "未选择模型";

        // 3. 网格区
        const grid = document.createElement("div");
        grid.className = "vl-grid";
        if (isStackMode) grid.style.flex = "1"; 

        // 4. 中间功能区
        let middleBar = null;
        let middleBtns = {};
        if (isStackMode) {
            middleBar = document.createElement("div");
            middleBar.className = "vl-middle-bar";
            middleBtns = this.createFooterButtons(middleBar); 
        }

        // 5. 底部区
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

    createFooterButtons(parentElement) {
        const btnView = document.createElement("button");
        btnView.className = "vl-btn";
        btnView.innerText = "查看注释"; 

        const btnEdit = document.createElement("button");
        btnEdit.className = "vl-btn primary";
        btnEdit.innerText = "修改注释";

        parentElement.append(btnView, btnEdit);
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
            const placeholder = document.createElement("div");
            placeholder.style.backgroundColor = "#444";
            placeholder.style.height = "100%";
            card.appendChild(placeholder);
        }

        const title = document.createElement("div");
        title.className = "vl-card-title";
        title.innerText = item.name.split(/[/\\]/).pop();
        card.appendChild(title);

        return card;
    },

    // --- 堆叠列表项 ---
    createStackItem(data, hasClip, onDelete, onChange) {
        const row = document.createElement("div");
        row.className = "vl-stack-item";

        // 1. 名称
        const nameDiv = document.createElement("div");
        nameDiv.className = "vl-stack-name";
        nameDiv.innerText = data.name.split(/[/\\]/).pop();
        nameDiv.title = data.name;

        // 2. 权重输入 (修复 CLIP 不显示问题)
        const createInput = (val, label) => {
            const wrap = document.createElement("div");
            wrap.className = "vl-stack-input-wrap";
            
            const lbl = document.createElement("span");
            lbl.innerText = label; 
            
            const inp = document.createElement("input");
            inp.type = "number";
            inp.step = "0.1";
            // 确保 val 有值，否则默认为 1.0
            inp.value = (val !== undefined && val !== null) ? val : 1.0;
            inp.className = "vl-stack-input";
            
            const typeKey = label === "模型" ? "model" : "clip";
            inp.onchange = (e) => onChange(typeKey, parseFloat(e.target.value));
            
            // 阻止按键冒泡，防止触发 ComfyUI 快捷键
            inp.onkeydown = (e) => e.stopPropagation(); 
            // 阻止滚轮修改数值时触发页面滚动
            inp.onwheel = (e) => e.stopPropagation();

            wrap.append(lbl, inp);
            return wrap;
        };

        const inputsDiv = document.createElement("div");
        inputsDiv.className = "vl-stack-inputs";
        
        // 始终添加模型权重
        inputsDiv.appendChild(createInput(data.strength_model, "模型"));
        
        // 【关键修复】只有 hasClip 为 true 时才添加 CLIP 权重
        if (hasClip) {
            inputsDiv.appendChild(createInput(data.strength_clip, "CLIP"));
        }

        // 3. 删除按钮
        const delBtn = document.createElement("button");
        delBtn.className = "vl-stack-del";
        delBtn.innerText = "×";
        delBtn.onclick = onDelete;

        row.append(nameDiv, inputsDiv, delBtn);
        return row;
    },

    showModal(container, title, content, isEditable, onSave) {
        // ... (保持原有的 Modal 代码) ...
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