// state_manager.js
export class StateManager {
    constructor(modelType, savedContext) {
        this.modelType = modelType;
        this.savedContext = savedContext;
        this.keyCat = `ComfyVL_${modelType}_Cat`;
        this.keyScroll = `ComfyVL_${modelType}_Scroll`;
    }

    // 获取初始分类
    getInitialCategory() {
        try {
            const localCat = localStorage.getItem(this.keyCat);
            if (localCat) return localCat;
            if (this.savedContext?.category) return this.savedContext.category;
        } catch (e) {
            console.warn("Local storage access denied");
        }
        return "全部";
    }

    // 获取初始搜索词
    getInitialSearch() {
        return this.savedContext?.search || "";
    }

    // 保存分类
    saveCategory(category) {
        if (this.savedContext) this.savedContext.category = category;
        localStorage.setItem(this.keyCat, category);
        // 切换分类时重置滚动
        this.saveScroll(0);
    }

    // 保存搜索词
    saveSearch(query) {
        if (this.savedContext) this.savedContext.search = query;
    }

    // 保存滚动位置 (建议配合防抖使用)
    saveScroll(scrollTop) {
        localStorage.setItem(this.keyScroll, scrollTop);
    }

    // 尝试恢复滚动位置 (包含重试逻辑)
    restoreScroll(gridElement) {
        const savedScroll = localStorage.getItem(this.keyScroll);
        if (!savedScroll) return;

        const target = parseInt(savedScroll);
        if (target <= 0) return;

        // 内部重试函数
        const attemptScroll = () => {
            if (gridElement.scrollHeight > gridElement.clientHeight) {
                if (Math.abs(gridElement.scrollTop - target) > 10) {
                    gridElement.scrollTop = target;
                }
            }
        };

        // 立即尝试
        attemptScroll();
        // 延迟尝试 (应对渲染滞后)
        setTimeout(attemptScroll, 100);
        setTimeout(attemptScroll, 300);
        setTimeout(attemptScroll, 600);
    }
}