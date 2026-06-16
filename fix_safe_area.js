const fs = require('fs');
const path = require('path');

const screensDir = path.join(process.cwd(), 'src', 'screens');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('SafeAreaView') && !content.includes('react-native-safe-area-context')) {
    // Find the react-native import block
    // e.g., import { View, SafeAreaView, Text } from 'react-native';
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]react-native['"]\s*;/;
    const match = content.match(importRegex);
    
    if (match) {
      let imports = match[1].split(',').map(s => s.trim());
      if (imports.includes('SafeAreaView')) {
        imports = imports.filter(i => i !== 'SafeAreaView');
        const newImportStr = `import { ${imports.join(', ')} } from 'react-native';`;
        content = content.replace(match[0], newImportStr);
        
        // Add new import
        content = `import { SafeAreaView } from 'react-native-safe-area-context';\n` + content;
        
        fs.writeFileSync(filePath, content);
        console.log('Fixed', path.basename(filePath));
      }
    }
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir(screensDir);
console.log('Done fixing SafeAreaView imports');
