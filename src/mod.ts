import {
    type BrowserElement,
    EVENT_NAME,
    type GBrowser,
    type GenerationDetail,
    type Tab,
    type TabsProgressListener
} from "./shared";
import { MODE_DRAWS, resolvePreset } from "thinking-orbs/engine";
import { clearCompletionDot, onTabSelect, showCompletionDot } from "./completion";

const SHOW_DELAY_MS = 300;
const ORB_CSS_SIZE = 16;
const DRAW_SIZE = 20;
const MAX_DPR = 2;
const FALLBACK_DPR = 1;
const MS_PER_SECOND = 1000;
const ORIGIN = 0;

const STATE_START = 0x1;
const STATE_IS_DOCUMENT = 0x20000;

interface TabOrb {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    showTimer: number | null;
    visible: boolean;
    generating: boolean;
}

declare const gBrowser: GBrowser;

const preset = resolvePreset("composing", DRAW_SIZE);
const orbs = new Map<Tab, TabOrb>();
const progressTitles = new Map<
    Tab,
    {
        label: Element;
        observer: MutationObserver;
        original: Element;
        progress: string;
    }
>();

let rafId: number | null = null;
let dpr = Number.NaN;

const updateDpr = (): void => {
    const current = Math.min(window.devicePixelRatio || FALLBACK_DPR, MAX_DPR);
    if (current === dpr) return;

    dpr = current;
    for (const orb of orbs.values()) {
        orb.canvas.width = ORB_CSS_SIZE * dpr;
        orb.canvas.height = ORB_CSS_SIZE * dpr;
    }
};

const render = (now: number): void => {
    rafId = null;
    updateDpr();

    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const time = (now / MS_PER_SECOND) * preset.speed;
    const scale = (dpr * ORB_CSS_SIZE) / DRAW_SIZE;
    let animating = false;

    for (const orb of orbs.values()) {
        if (orb.visible) {
            orb.ctx.setTransform(scale, ORIGIN, ORIGIN, scale, ORIGIN, ORIGIN);
            orb.ctx.clearRect(ORIGIN, ORIGIN, DRAW_SIZE, DRAW_SIZE);
            MODE_DRAWS[preset.mode](orb.ctx, DRAW_SIZE, time, dark, preset.opts);
            animating = true;
        }
    }

    if (animating) {
        rafId = window.requestAnimationFrame(render);
    }
};

const showOrb = (tab: Tab): void => {
    const orb = orbs.get(tab);

    if (!orb || orb.visible || orb.showTimer !== null) return;

    orb.showTimer = window.setTimeout(() => {
        orb.showTimer = null;

        const stack = tab.querySelector(".tab-icon-stack");
        if (!stack) return;

        if (!orb.canvas.isConnected) {
            stack.appendChild(orb.canvas);
        }

        tab.setAttribute("tab-thinking-active", "true");
        orb.visible = true;

        rafId ??= window.requestAnimationFrame(render);
    }, SHOW_DELAY_MS);
};

const hideOrb = (tab: Tab): void => {
    const orb = orbs.get(tab);
    if (!orb) return;

    orb.generating = false;

    if (orb.showTimer !== null) {
        window.clearTimeout(orb.showTimer);
        orb.showTimer = null;
    }

    if (orb.visible) {
        orb.canvas.remove();
        tab.removeAttribute("tab-thinking-active");
        orb.visible = false;
    }
};

const createCanvas = (): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
    updateDpr();
    const canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("Failed to get a 2D context for the orb canvas.");
    }

    canvas.className = "tab-thinking-indicator-orb";
    canvas.setAttribute("aria-hidden", "true");
    canvas.width = ORB_CSS_SIZE * dpr;
    canvas.height = ORB_CSS_SIZE * dpr;
    canvas.style.width = `${String(ORB_CSS_SIZE)}px`;
    canvas.style.height = `${String(ORB_CSS_SIZE)}px`;

    return {
        canvas,
        ctx
    };
};

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

const onGenerationState = (browser: BrowserElement, generating: boolean): void => {
    const tab = gBrowser.getTabForBrowser(browser);
    if (!tab) return;

    if (!generating) {
        clearProgressTitle(tab);
        hideOrb(tab);
        return;
    }

    let orb = orbs.get(tab);

    if (!orb) {
        const { canvas, ctx } = createCanvas();
        orb = {
            canvas,
            ctx,
            generating: false,
            showTimer: null,
            visible: false
        };
        orbs.set(tab, orb);
    }

    clearCompletionDot(tab);
    orb.generating = true;
    showOrb(tab);
};

const onGenerationEvent = (event: Event): void => {
    const { browser, generating, progress } = (event as CustomEvent<GenerationDetail>).detail;
    const tab = gBrowser.getTabForBrowser(browser);
    if (!tab) return;

    const completed = !generating && orbs.get(tab)?.generating;
    onGenerationState(browser, generating);
    updateProgressTitle(tab, generating ? progress : "");

    if (completed && tab !== gBrowser.selectedTab) {
        showCompletionDot(tab);
    }
};

const tabsProgressListener: TabsProgressListener = {
    onStateChange(...args: unknown[]): void {
        const browser = args[0] as BrowserElement;
        const stateFlags = args[3] as number;

        // oxlint-disable-next-line no-bitwise
        if ((stateFlags & (STATE_START | STATE_IS_DOCUMENT)) === (STATE_START | STATE_IS_DOCUMENT)) {
            const tab = gBrowser.getTabForBrowser(browser);
            if (tab) {
                clearCompletionDot(tab);
            }

            onGenerationState(browser, false);
        }
    }
};

const onTabClose = (event: Event): void => {
    const tab = event.target as Tab;

    clearProgressTitle(tab);
    clearCompletionDot(tab);
    hideOrb(tab);
    orbs.delete(tab);
};

const cleanup = (): void => {
    window.removeEventListener(EVENT_NAME, onGenerationEvent);
    gBrowser.tabContainer.removeEventListener("TabClose", onTabClose);
    gBrowser.tabContainer.removeEventListener("TabSelect", onTabSelect);
    gBrowser.removeTabsProgressListener(tabsProgressListener);

    for (const tab of [...orbs.keys()]) {
        clearProgressTitle(tab);
        clearCompletionDot(tab);
        hideOrb(tab);
        orbs.delete(tab);
    }
};

gBrowser.tabContainer.addEventListener("TabClose", onTabClose);
gBrowser.tabContainer.addEventListener("TabSelect", onTabSelect);
gBrowser.addTabsProgressListener(tabsProgressListener);
window.addEventListener(EVENT_NAME, onGenerationEvent);
window.addEventListener("unload", cleanup, { once: true });
