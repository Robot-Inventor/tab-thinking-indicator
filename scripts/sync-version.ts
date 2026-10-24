import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import packageJson from "../package.json";

const JSON_INDENT = 4;

const main = async (): Promise<void> => {
    const { version } = packageJson;
    const themeJsonPath = join(import.meta.dirname, "../theme.json");
    const themeJson = JSON.parse(await readFile(themeJsonPath, "utf-8")) as { version: string };
    themeJson.version = version;
    await writeFile(themeJsonPath, JSON.stringify(themeJson, null, JSON_INDENT), "utf-8");
};

await main();
