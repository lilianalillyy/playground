import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { rootDir } from "../constants.js";
import chalk from "chalk";

export interface PersistData {
  query: string | string[];
  url: string | string[];
}

export interface PersistState {
  queries: string[];
  urls: string[];
}

export class StatePersistor {
  public static persist(id: string, data: PersistData) {
    const queries = Array.isArray(data.query) ? data.query : [data.query];
    const urls = Array.isArray(data.url) ? data.url : [data.url];

    const file = path.join(rootDir, "..", `${id}.json`);

    if (!existsSync(file)) {
      writeFileSync(file, JSON.stringify({ queries, urls }, null, 2));
      return;
    }

    try {
      const state: PersistState = JSON.parse(readFileSync(file, "utf-8"));

      state.queries = state.queries
        .concat(queries)
        .filter((q, i, a) => a.indexOf(q) === i);

      state.urls = state.urls
        .concat(urls)
        .filter((u, i, a) => a.indexOf(u) === i);

      writeFileSync(file, JSON.stringify(state, null, 2));
    } catch (e) {
      console.error(
        chalk.red(
          `failed to save state ('${JSON.stringify({ queries, urls })}')`
        ),
        { e }
      );
    }
  }
}
