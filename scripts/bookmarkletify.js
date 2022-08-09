/*
 * A node script for turning a JS file into a bookmarklet format.
 * Note that the path to the target file must be provided as an argument.
 * For example:
 *  "$ node bookmarkletify.js /path/to/file.js"
 */

const fs = require('fs');

const path = process.argv[2];
if (path === undefined) {
    throw new Error('Must include path to target file as argument')
}

try {
    const content = fs.readFileSync(path, 'utf8');
    if (content.startsWith('javascript:')) {
        throw new Error('File is already in "bookmarklet" format')
    }
    // Replace all double and single quotes in bookmarklet with their decimal code equivalent
    // in-order to allow easy assignment as the `href` value of an HTML anchor element.
    const cleanContent = content.replace(/"/g, "&#34;").replace(/'/g, "&#39;");
    fs.writeFileSync(path, `javascript:(()=>{${cleanContent}})();`);
} catch (err) {
    throw new Error(err);
}
