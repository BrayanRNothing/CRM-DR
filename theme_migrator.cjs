const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  let files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      if(file.endsWith('.jsx')) filelist.push(path.join(dir, file));
    }
  });
  return filelist;
};

const pagesFiles = walkSync(path.join(__dirname, 'src', 'pages'));
const componentsFiles = walkSync(path.join(__dirname, 'src', 'components'));
const layoutsFiles = walkSync(path.join(__dirname, 'src', 'layouts'));
const files = [...pagesFiles, ...componentsFiles, ...layoutsFiles];

let changedFiles = 0;

// Lista de colores que eran 'primarios' en la app original
// emerald y teal los usaba el Prospector. blue lo usaba el Closer.
const allColors = ['blue', 'teal', 'indigo', 'emerald'];

files.forEach(file => {
  let initial = fs.readFileSync(file, 'utf8');
  let content = initial;

  allColors.forEach(color => {
    // bg-color-X
    content = content.replace(new RegExp(`hover:bg-${color}-(\\d{2,3})`, 'g'), 'hover:bg-\(--theme-$1\)');
    content = content.replace(new RegExp(`\\bbg-${color}-(\\d{2,3})\\b`, 'g'), 'bg-\(--theme-$1\)');
    
    // text-color-X
    content = content.replace(new RegExp(`hover:text-${color}-(\\d{2,3})`, 'g'), 'hover:text-\(--theme-$1\)');
    content = content.replace(new RegExp(`\\btext-${color}-(\\d{2,3})\\b`, 'g'), 'text-\(--theme-$1\)');

    // border-color-X
    content = content.replace(new RegExp(`hover:border-${color}-(\\d{2,3})`, 'g'), 'hover:border-\(--theme-$1\)');
    content = content.replace(new RegExp(`\\bborder-${color}-(\\d{2,3})\\b`, 'g'), 'border-\(--theme-$1\)');
    
    // ring, shadow, gradients
    content = content.replace(new RegExp(`\\bring-${color}-(\\d{2,3})\\b`, 'g'), 'ring-\(--theme-$1\)');
    content = content.replace(new RegExp(`\\bshadow-${color}-(\\d{2,3})\\b`, 'g'), 'shadow-\(--theme-$1\)');
    content = content.replace(new RegExp(`\\bfrom-${color}-(\\d{2,3})\\b`, 'g'), 'from-\(--theme-$1\)');
    content = content.replace(new RegExp(`\\bto-${color}-(\\d{2,3})\\b`, 'g'), 'to-\(--theme-$1\)');
    content = content.replace(new RegExp(`\\bvia-${color}-(\\d{2,3})\\b`, 'g'), 'via-\(--theme-$1\)');
    
    // opacity modifiers bg-blue-500/10 etc (Tailwind v4 syntax compatibility, but generally we matched the \b boundary above so we don't need distinct ones unless they have / syntax, \b handles it before the /)
  });

  if(content !== initial) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log('Modified: ' + file);
  }
});

console.log('Total changed: ' + changedFiles);
