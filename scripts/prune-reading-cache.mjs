import { readFileSync, writeFileSync } from "fs";
import { isCompleteStandardReading } from "../src/lib/reading-sections.ts";

const path = new URL("../src/data/cache.json", import.meta.url);
const cache = JSON.parse(readFileSync(path, "utf8"));
let pruned = 0;

for (const key of Object.keys(cache)) {
  if (key.startsWith("premium:")) continue;
  const entry = cache[key];
  if (!entry?.reading || !isCompleteStandardReading(entry.reading, entry.easternTeaser)) {
    delete cache[key];
    pruned++;
  }
}

writeFileSync(path, JSON.stringify(cache, null, 2));
console.log(`Pruned ${pruned} incomplete cache entr${pruned === 1 ? "y" : "ies"}.`);
