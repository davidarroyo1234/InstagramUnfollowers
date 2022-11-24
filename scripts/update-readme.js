const fs = require('fs');

const readmePath = process.argv[2];
const minifiedCodePath = process.argv[3];

const CODE_BLOCK_START = "```js";
const CODE_BLOCK_END = "```";

const replaceRange = (s, start, end, substitute) => {
    return s.substring(0, start) + substitute + s.substring(end);
}

const readmeData = fs.readFileSync(readmePath, {encoding: 'utf8', flag: 'r'});
const minifiedCode = fs.readFileSync(minifiedCodePath, {encoding: 'utf8', flag: 'r'});

const replaceStartIndex = readmeData.indexOf(CODE_BLOCK_START) + CODE_BLOCK_START.length + 1;
const replaceEndIndex = readmeData.lastIndexOf(CODE_BLOCK_END) - 1;

const parsedReadme = replaceRange(readmeData, replaceStartIndex, replaceEndIndex, minifiedCode);
fs.writeFileSync(readmePath, parsedReadme);

