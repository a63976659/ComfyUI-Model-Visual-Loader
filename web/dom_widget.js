import { api } from "../../scripts/api.js";
import { app } from "../../scripts/app.js";

// 【修改】新增 savedContext 参数，用于接收保存的状态
export function createVisualWidget(node, modelType, topPadding, savedContext) {
    const container = document.createElement("div");
    container.className = "visual-loader-container";

    // 使用 JS 动态控制位置
    container.style.top = `${topPadding}px`;
    container.style.height = `calc(100% - ${topPadding + 10}px)`;

    // Header
    const header = document.createElement("div");
    header.className = "vl-header";

    const categorySelect = document.createElement("select");
    categorySelect.className = "vl-select";
    // 默认先加一个全部，后续会被 updateCategories 覆盖
    const optAll = document.createElement("option");
    optAll.value = "全部";
    optAll.text = "全部";
    categorySelect.appendChild(optAll);

    const searchInput = document.createElement("input");
    searchInput.className = "vl-search";
    searchInput.type = "text";
    searchInput.placeholder = "搜索模型...";

    header.appendChild(categorySelect);
    header.appendChild(searchInput);

    const infoBar = document.createElement("div");
    infoBar.className = "vl-info-bar";
    infoBar.innerText = "未选择模型";

    const grid = document.createElement("div");
    grid.className = "vl-grid";

    container.appendChild(header);
    container.appendChild(infoBar);
    container.appendChild(grid);

    // --- 逻辑部分 ---
    let allItems = [];
    
    // 【核心修改1：状态恢复】
    // 如果有保存的状态，就用保存的，否则用默认值
    let currentCategory = savedContext?.category || "全部";
    let searchQuery = savedContext?.search || "";

    // 恢复搜索框的值
    searchInput.value = searchQuery;

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
            if (node.widgets[0].value === item.name) {
                card.classList.add("selected");
            }

            card.onclick = () => {
                node.widgets[0].value = item.name;
                node.widgets[0].callback && node.widgets[0].callback(item.name);
                infoBar.innerText = item.name.split(/[/\\]/).pop();
                const prev = grid.querySelector(".selected");
                if (prev) prev.classList.remove("selected");
                card.classList.add("selected");
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

    // 【核心修改2：排序逻辑】
    function updateCategories(items) {
        const categories = new Set(["全部"]);
        items.forEach(i => i.category && categories.add(i.category));
        
        // 转换数组并进行自定义排序
        const sortedCats = Array.from(categories).sort((a, b) => {
            // 1. "全部" 永远置顶
            if (a === "全部") return -1;
            if (b === "全部") return 1;
            
            // 2. "根目录" 永远第二
            if (a === "根目录") return -1;
            if (b === "根目录") return 1;
            
            // 3. 其他按照 A-Z 排序 (支持中文拼音)
            return a.localeCompare(b, "zh-CN");
        });

        categorySelect.innerHTML = "";
        sortedCats.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.text = cat;
            categorySelect.appendChild(opt);
        });

        // 【关键】下拉菜单构建完成后，恢复选中的值
        categorySelect.value = currentCategory;
    }

    // --- 事件绑定 ---

    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        // 【核心修改3：状态保存】
        if (savedContext) savedContext.search = searchQuery;
        renderGrid();
    });
    
    searchInput.addEventListener("keydown", (e) => e.stopPropagation());
    
    categorySelect.addEventListener("change", (e) => {
        currentCategory = e.target.value;
        // 【核心修改3：状态保存】
        if (savedContext) savedContext.category = currentCategory;
        
        renderGrid();
        grid.scrollTop = 0;
    });

    api.fetchApi(`/visual_loader/models?type=${modelType}`)
        .then(res => res.json())
        .then(data => {
            allItems = data;
            updateCategories(data);
            renderGrid();
            const currentVal = node.widgets[0].value;
            if(currentVal) {
                infoBar.innerText = currentVal.split(/[/\\]/).pop();
            }
        });

    return { widget: container };
}