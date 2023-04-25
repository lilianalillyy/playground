const out = require("fs")
    .readFileSync("temp.txt", "utf-8")
    .split("\n").map((str) => (/(.*) -> (.*)/.exec(str) ?? [null, null, null]).slice(1))
    .filter(val => !!val[0] && !!val[1])

let staticTitleFilter = [];
let staticVideoIds = [];

for (const [title, url] of out) {
    staticTitleFilter.push(title);
    staticVideoIds.push(url);
}

console.log(JSON.stringify({staticTitleFilter, staticVideoIds}))