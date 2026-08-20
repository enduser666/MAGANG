const ts = require('typescript');
const fs = require('fs');

const fileContent = fs.readFileSync('src/db/index.ts', 'utf8');
const sourceFile = ts.createSourceFile(
  'index.ts',
  fileContent,
  ts.ScriptTarget.Latest,
  true
);

let getDbClientNode = null;
ts.forEachChild(sourceFile, (node) => {
  if (ts.isFunctionDeclaration(node) && node.name && node.name.text === 'getDbClient') {
    getDbClientNode = node;
  }
});

if (getDbClientNode) {
  const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(getDbClientNode.getStart());
  const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(getDbClientNode.getEnd());
  console.log(`getDbClient is at lines: ${startLine + 1} to ${endLine + 1}`);
  
  // Find top level return
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isReturnStatement(node)) {
        const { line: rLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        console.log(`TOP LEVEL RETURN AT LINE: ${rLine + 1}`);
    }
  });
} else {
  console.log('getDbClient not found');
}
