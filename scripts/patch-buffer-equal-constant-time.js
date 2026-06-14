const fs = require("node:fs");
const path = require("node:path");

const target = path.join(
  __dirname,
  "..",
  "node_modules",
  "buffer-equal-constant-time",
  "index.js"
);

if (!fs.existsSync(target)) {
  process.exit(0);
}

const source = fs.readFileSync(target, "utf8");
const before = "var SlowBuffer = require('buffer').SlowBuffer;";
const after = "var SlowBuffer = require('buffer').SlowBuffer || Buffer;";

if (source.includes(after)) {
  process.exit(0);
}

if (source.includes(before)) {
  fs.writeFileSync(target, source.replace(before, after));
}

