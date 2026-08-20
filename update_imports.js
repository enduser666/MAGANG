
const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  const list = fs.readdirSync(dir);
  for (let file of list) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) walk(file, callback);
    else callback(file);
  }
}

walk('src', (file) => {
  if (file.endsWith('.ts') || file.endsWith('.tsx')) {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content
      .replace(/@\/lib\/connectors/g, '@/connectors')
      .replace(/\.\.\/lib\/connectors/g, '../connectors')
      .replace(/\.\.\/\.\.\/lib\/connectors/g, '../../connectors')
      .replace(/@\/lib\/runtime/g, '@/runtime')
      .replace(/\.\.\/lib\/runtime/g, '../runtime')
      .replace(/\.\.\/\.\.\/lib\/runtime/g, '../../runtime')
      .replace(/@\/lib\/db/g, '@/db')
      .replace(/\.\.\/lib\/db/g, '../db')
      .replace(/\.\.\/\.\.\/lib\/db/g, '../../db')
      .replace(/@\/context\//g, '@/providers/')
      .replace(/\.\.\/context\//g, '../providers/');

    if (content !== newContent) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log('Updated: ' + file);
    }
  }
});

