const fs = require('fs');

const readmePath = process.argv[2];
const minifiedCodePath = process.argv[3];

const codeBlockStart = "```js";
const codeBlockEnd = "```";

const replaceRange = (s, start, end, substitute) => {
    return s.substring(0, start) + substitute + s.substring(end);
}

const readmeData = fs.readFileSync(readmePath, {encoding: 'utf8', flag: 'r'});
const minifiedCode = fs.readFileSync(minifiedCodePath, {encoding: 'utf8', flag: 'r'});

replaceStartIndex = readmeData.indexOf(codeBlockStart) + codeBlockStart.length + 1;
replaceEndIndex = readmeData.lastIndexOf(codeBlockEnd) - 1;

const parsedReadme = replaceRange(readmeData, replaceStartIndex, replaceEndIndex, minifiedCode);
fs.writeFileSync(readmePath, parsedReadme);

