const fs = require("fs");

const indexPath = process.argv[2];
const minifiedCodePath = process.argv[3];

const CODE_BLOCK_START = "const instagramScript = \"";
const CODE_BLOCK_END = "\";//__END_OF_SCRIPT__";

const replaceRange = (s, start, end, substitute) => {
  return s.substring(0, start) + substitute + s.substring(end);
};

const indexData = fs.readFileSync(indexPath, { encoding: "utf8", flag: "r" });
let minifiedCode = fs.readFileSync(minifiedCodePath, { encoding: "utf8", flag: "r" });
const replaceStartIndex = indexData.indexOf(CODE_BLOCK_START) + CODE_BLOCK_START.length;
const replaceEndIndex = indexData.lastIndexOf(CODE_BLOCK_END);
minifiedCode = minifiedCode.replace(/"/g, "\\\"");
minifiedCode = minifiedCode.replace(/\\n/g, "\\\\n");
const parsedReadme = replaceRange(indexData, replaceStartIndex, replaceEndIndex, minifiedCode);
fs.writeFileSync(indexPath, parsedReadme);

