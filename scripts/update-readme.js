/*
 * A node script for updating the main bookmarklet link `README.md` file upon app build.
 * Due to some technical constraints, this is a rather hacky script which
 * makes some assumptions regarding the README file and said link.
 * Hence, it is dedicated to this environment and set-up, and some changes
 * with the link in the README file might cause it to stop working.
 */

// TODO: try to improve this script and make it more abstract.

const fs = require('fs');

try {
    const minifiedScript = fs.readFileSync('min/min.js', 'utf8')
    const readmeContent = fs.readFileSync('README.md', 'utf8');
    var bookmarkletExcerpt = readmeContent.substring(
        readmeContent.indexOf('javascript:(()=>{'),
        readmeContent.indexOf('" indicator'),
    );
    const updatedReadme = readmeContent.replace(bookmarkletExcerpt, minifiedScript);
    fs.writeFileSync('README.md', updatedReadme);
} catch (err) {
    throw new Error(err);
}
