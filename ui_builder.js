// ui_builder.js
export const UI = {
    // 创建基础骨架
    createSkeleton(topPadding) {
        const container = document.createElement("div");
        container.className = "visual-loader-container";
        container.style.top = `${topPadding}px`;
        container.style.height = `calc(100% - ${topPadding + 10}px)`;

        const header = document.createElement("div");
        header.className = "vl-header";

        const infoBar = document.createElement("div");
        infoBar.className = "vl-info-bar";
        infoBar.innerText = "未选择模型";

        const grid = document.createElement("div");
        grid.className = "vl-grid";

        const footer = document.createElement("div");
        footer.className = "vl-footer";

        container.append(header, infoBar, grid, footer);

        return { container, header, infoBar, grid, footer };
    },

    // 创建头部控件
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

    // 创建底部按钮
    createFooterButtons(footerElement) {
        const btnView = document.createElement("button");
        btnView.className = "vl-btn";
        btnView.innerText = "查看注释"; 

        const btnEdit = document.createElement("button");
        btnEdit.className = "vl-btn primary";
        btnEdit.innerText = "修改注释";

        footerElement.append(btnView, btnEdit);
        return { btnView, btnEdit };
    },

    // 创建单个卡片
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

    // 显示弹窗 (完全从主逻辑剥离)
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
            save.onclick = async () => { 
                await onSave(txt.value); 
                overlay.remove(); 
            };
            acts.appendChild(save);
        }
        
        modal.append(h, txt, acts);
        overlay.appendChild(modal);
        container.appendChild(overlay);
    }
};