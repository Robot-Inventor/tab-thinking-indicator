import { defineConfig } from "tsdown";

const common = {
    clean: true,
    dts: false,
    format: "esm",
    minify: false,
    outDir: "dist",
    platform: "browser",
    sourcemap: false
} as const;

export default [
    defineConfig({
        ...common,
        deps: {
            alwaysBundle: [/thinking-orbs/u]
        },
        entry: {
            "mod.uc": "src/mod.ts"
        }
    }),
    defineConfig({
        ...common,
        entry: {
            "background.sys": "src/background.ts"
        },
        outExtensions: () => ({
            js: ".mjs"
        })
    }),
    defineConfig({
        ...common,
        entry: {
            "actor-child.sys": "src/actor-child.ts"
        },
        outExtensions: () => ({
            js: ".mjs"
        })
    }),
    defineConfig({
        ...common,
        entry: {
            "actor-parent.sys": "src/actor-parent.ts"
        },
        outExtensions: () => ({
            js: ".mjs"
        })
    })
];
