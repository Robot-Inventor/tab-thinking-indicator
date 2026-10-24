const dots = new WeakMap<Element, Element>();

const clearCompletionDot = (tab: Element): void => {
    dots.get(tab)?.remove();
    dots.delete(tab);
};

const showCompletionDot = (tab: Element): void => {
    const stack = tab.querySelector(".tab-icon-stack");
    if (!stack || dots.has(tab)) return;

    const dot = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
    dot.className = "tab-thinking-completion-dot";
    dot.setAttribute("aria-hidden", "true");
    stack.appendChild(dot);
    dots.set(tab, dot);
};

const onTabSelect = (event: Event): void => {
    clearCompletionDot(event.target as Element);
};

export { clearCompletionDot, onTabSelect, showCompletionDot };
