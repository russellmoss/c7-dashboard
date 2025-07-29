const fs = require('fs');
const path = require('path');

function addJsExtensions(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      addJsExtensions(filePath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Add .js extensions to relative imports
      content = content.replace(
        /from ['"](\.[^'"]+)['"]/g,
        (match, importPath) => {
          if (!importPath.endsWith('.js')) {
            return `from '${importPath}.js'`;
          }
          return match;
        }
      );
      
      fs.writeFileSync(filePath, content);
      console.log(`Updated imports in ${filePath}`);
    }
  }
}

console.log('Adding .js extensions to compiled worker files...');
addJsExtensions('./dist');
console.log('Done!'); 