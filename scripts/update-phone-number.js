// scripts/update-phone-number.js
const fs = require('fs');
const path = require('path');

const oldPhoneNumbers = [
  '3523395181',
  '352-339-5181',
  '(352) 339-5181',
  '352.339.5181'
];

const newPhoneNumber = '352-933-5181';
const newPhoneNumberFormatted = '(352) 933-5181';
const newPhoneNumberClean = '3529335181';

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace various formats
    oldPhoneNumbers.forEach(oldNum => {
      if (content.includes(oldNum)) {
        // Handle tel: links
        content = content.replace(new RegExp(`tel:${oldNum.replace(/[\s()-]/g, '')}`, 'g'), `tel:${newPhoneNumberClean}`);
        
        // Handle formatted display
        if (oldNum.includes('(') || oldNum.includes('-')) {
          content = content.replace(new RegExp(oldNum.replace(/[()]/g, '\\$&'), 'g'), newPhoneNumberFormatted);
        } else if (oldNum.includes('.')) {
          content = content.replace(new RegExp(oldNum.replace(/\./g, '\\.'), 'g'), newPhoneNumber);
        } else {
          // Clean number format
          content = content.replace(new RegExp(oldNum, 'g'), newPhoneNumberClean);
        }
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .git directories
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        walkDirectory(filePath);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.json') || file.endsWith('.md')) {
      replaceInFile(filePath);
    }
  });
}

// Run the update
console.log('Updating phone numbers throughout the project...');
walkDirectory(path.join(__dirname, '../frontend'));
walkDirectory(path.join(__dirname, '../backend'));
console.log('Phone number update complete!');

// List of files that should be manually verified:
console.log('\nPlease manually verify these locations:');
console.log('- All contact information sections');
console.log('- Footer phone numbers');
console.log('- Call-to-action buttons');
console.log('- Contact page');
console.log('- Emergency contact information');