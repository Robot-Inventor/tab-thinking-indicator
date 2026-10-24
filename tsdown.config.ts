import { defineConfig } from "tsdown";

export default [
    defineConfig({
        deps: {
            alwaysBundle: [/thinking-orbs/u]
        },
        dts: false,
        entry: {
            "mod.uc": "src/mod.ts"
        },
        format: "esm",
        minify: false,
        outDir: "dist",
        platform: "browser",
        sourcemap: false
    }),
    defineConfig({
        dts: false,
        entry: {
            frame: "src/frame.ts"
        },
        format: "esm",
        minify: false,
        outDir: "dist",
        platform: "browser",
        sourcemap: false
    })
];
