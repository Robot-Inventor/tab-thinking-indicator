import type { Tab } from "./shared";

const progressTitles = new Map<
    Tab,
    {
        label: Element;
        observer: MutationObserver;
        original: Element;
        progress: string;
    }
>();

const clearProgressTitle = (tab: Tab): void => {
    const entry = progressTitles.get(tab);
    if (!entry) return;

    entry.observer.disconnect();
    entry.label.remove();
    tab.removeAttribute("tab-thinking-progress");
    progressTitles.delete(tab);
};

const syncProgressLabel = (label: Element, original: Element, title: string): void => {
    for (const name of label.getAttributeNames()) {
        label.removeAttribute(name);
    }

    for (const attribute of original.attributes) {
        label.setAttribute(attribute.name, attribute.value);
    }

    label.removeAttribute("id");
    label.classList.add("tab-thinking-progress-label");
    label.textContent = title;

    for (const name of ["value", "text"]) {
        if (original.hasAttribute(name)) {
            label.setAttribute(name, title);
        }
    }
};

const updateProgressTitle = (tab: Tab, progress: string): void => {
    if (!progress) {
        clearProgressTitle(tab);

        return;
    }

    let entry = progressTitles.get(tab);

    if (!entry) {
        const original = tab.querySelector(".tab-label-container > .tab-label:not(.tab-thinking-progress-label)");
        if (!original) return;

        const label = original.cloneNode(false);
        if (!(label instanceof Element)) return;

        const observer = new MutationObserver(() => {
            updateProgressTitle(tab, progressTitles.get(tab)?.progress ?? "");
        });

        observer.observe(tab, { attributeFilter: ["label"] });
        observer.observe(original, { attributes: true });
        original.after(label);

        entry = {
            label,
            observer,
            original,
            progress
        } as const;

        progressTitles.set(tab, entry);
        tab.setAttribute("tab-thinking-progress", "true");
    }

    entry.progress = progress;

    syncProgressLabel(entry.label, entry.original, `${progress}: ${tab.getAttribute("label") ?? ""}`);
};

export { clearProgressTitle, updateProgressTitle };
