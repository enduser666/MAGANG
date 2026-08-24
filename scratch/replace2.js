const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else {
            if (file.match(/\.(ts|tsx|js|jsx)$/)) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');
let changedCount = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content.replace(/(['"])\.\.\/lib\//g, '$1@/backend/lib/')
                            .replace(/(['"])\.\.\/\.\.\/lib\//g, '$1@/backend/lib/')
                            .replace(/(['"])\.\.\/services\//g, '$1@/backend/services/')
                            .replace(/(['"])\.\.\/\.\.\/services\//g, '$1@/backend/services/');
    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        changedCount++;
        console.log(`Updated ${file}`);
    }
});
console.log(`Finished updating ${changedCount} files.`);
