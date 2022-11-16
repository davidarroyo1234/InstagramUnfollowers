/**
 * Compiles given CSS file and adds it to target JS file.
 * Adds it as a stylesheet to document's head.
 * Exports output to a new JS file with the combined JS & CSS.
 * 
 * Takes 3 parameters:
 *  1. Path to main JS file, which the CSS should be compiled into.
 *  2. Path to desired CSS file.
 *  3. Path for generated output JS file.
 * 
 * Usage:
 * $ node compile-css <main-file-path> <css-file-path> <target-file-path>
 * 
 * Example:
 * $ node compile-css dist/dist.styles.css src/main.js dist/dist.js
 */

const fs = require('fs');

const mainFilePath = process.argv[2];
const cssFilePath = process.argv[3];
const targetFilePath = process.argv[4];

if (mainFilePath === undefined) {
    throw new Error('Must provide main file path')
}
if (cssFilePath === undefined) {
    throw new Error('Must provide CSS file path')
}
if (targetFilePath === undefined) {
    throw new Error('Must provide target file path')
}

const mainFileContent = fs.readFileSync(mainFilePath, 'utf8', (err, mainFileContent) => {
    if (err !== null) {
        throw new Error(err);
    }
    return mainFileContent;
})

const cssFileContent = fs.readFileSync(cssFilePath, 'utf8', (err, data) => {
    if (err) {
        throw new Error(err);
    }
    return data;
})

const appendedData = `
    ${mainFileContent}
    const styleMarkup = \`${cssFileContent}\`;
    const elStyle = document.createElement('style');
    elStyle.innerHTML = styleMarkup;
    document.head.appendChild(elStyle);
`;

fs.writeFileSync(targetFilePath, appendedData, { 
    encoding: 'utf8',
});
