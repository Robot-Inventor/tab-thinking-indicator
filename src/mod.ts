import { MODE_DRAWS, resolvePreset } from "thinking-orbs/engine";

const MOD_ID = "io.roboin.tab-thinking-indicator";
const MESSAGE_NAME = `${MOD_ID}:generating`;
const FRAME_SCRIPT_URL = `chrome://sine/content/${MOD_ID}/dist/frame.js`;

const SHOW_DELAY_MS = 300;

const ORB_CSS_SIZE = 16;
const DRAW_SIZE = 20;
const MAX_DPR = 2;
const MS_PER_SECOND = 1000;

interface MessageManager {
    loadFrameScript(url: string, allowDelayed: boolean): void;
    removeDelayedFrameScript(url: string): void;
    addMessageListener(name: string, listener: MessageListener): void;
    removeMessageListener(name: string, listener: MessageListener): void;
}

interface MessageListener {
    receiveMessage(message: BrowserMessage): void;
}

interface BrowserMessage {
    target: BrowserElement;
    data: { generating: boolean };
}

interface BrowserElement {
    messageManager: MessageManager;
}

interface Tab extends Element {
    linkedBrowser: BrowserElement;
}

interface GBrowser {
    tabs: Tab[];
    getTabForBrowser(browser: BrowserElement): Tab | null;
    tabContainer: Element;
}

declare const gBrowser: GBrowser;

interface TabOrb {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    showTimer: number | null;
    visible: boolean;
}

const preset = resolvePreset("composing", DRAW_SIZE);
const orbs = new Map<Tab, TabOrb>();

let rafId = 0;
let dpr = Number.NaN;

const updateDpr = (): void => {
    // oxlint-disable-next-line no-magic-numbers
    const current = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    if (current === dpr) return;

    dpr = current;

    for (const orb of orbs.values()) {
        orb.canvas.width = ORB_CSS_SIZE * dpr;
        orb.canvas.height = ORB_CSS_SIZE * dpr;
    }
};

const render = (now: number): void => {
    // oxlint-disable-next-line no-magic-numbers
    rafId = 0;
    updateDpr();

    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const time = (now / MS_PER_SECOND) * preset.speed;
    const scale = (dpr * ORB_CSS_SIZE) / DRAW_SIZE;
    let animating = false;

    for (const orb of orbs.values()) {
        // oxlint-disable-next-line no-continue
        if (!orb.visible) continue;

        // oxlint-disable-next-line no-magic-numbers
        orb.ctx.setTransform(scale, 0, 0, scale, 0, 0);
        // oxlint-disable-next-line no-magic-numbers
        orb.ctx.clearRect(0, 0, DRAW_SIZE, DRAW_SIZE);
        MODE_DRAWS[preset.mode](orb.ctx, DRAW_SIZE, time, dark, preset.opts);
        animating = true;
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

        if (!rafId) {
            rafId = window.requestAnimationFrame(render);
        }
    }, SHOW_DELAY_MS);
};

const hideOrb = (tab: Tab): void => {
    const orb = orbs.get(tab);
    if (!orb) return;

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

const onGenerationState = (message: BrowserMessage): void => {
    const tab = gBrowser.getTabForBrowser(message.target);
    if (!tab) return;

    if (!message.data.generating) {
        hideOrb(tab);
        return;
    }

    let orb = orbs.get(tab);

    if (!orb) {
        const { canvas, ctx } = createCanvas();
        orb = {
            canvas,
            ctx,
            showTimer: null,
            visible: false
        };
        orbs.set(tab, orb);
    }

    showOrb(tab);
};

const messageListener = {
    receiveMessage(message) {
        onGenerationState(message);
    }
} as const satisfies MessageListener;

const injectTab = (tab: Tab): void => {
    const { messageManager } = tab.linkedBrowser;
    messageManager.loadFrameScript(FRAME_SCRIPT_URL, true);
    messageManager.addMessageListener(MESSAGE_NAME, messageListener);
};

const uninjectTab = (tab: Tab): void => {
    const { messageManager } = tab.linkedBrowser;

    messageManager.removeMessageListener(MESSAGE_NAME, messageListener);
    messageManager.removeDelayedFrameScript(FRAME_SCRIPT_URL);
};

const onTabOpen = (event: Event): void => {
    injectTab(event.target as Tab);
};

const onTabClose = (event: Event): void => {
    const tab = event.target as Tab;

    hideOrb(tab);
    orbs.delete(tab);
    uninjectTab(tab);
};

const cleanup = (): void => {
    gBrowser.tabContainer.removeEventListener("TabOpen", onTabOpen);
    gBrowser.tabContainer.removeEventListener("TabClose", onTabClose);

    for (const tab of [...orbs.keys()]) {
        hideOrb(tab);
        orbs.delete(tab);
    }
};

for (const tab of gBrowser.tabs) {
    injectTab(tab);
}

gBrowser.tabContainer.addEventListener("TabOpen", onTabOpen);
gBrowser.tabContainer.addEventListener("TabClose", onTabClose);
window.addEventListener("unload", cleanup, { once: true });
