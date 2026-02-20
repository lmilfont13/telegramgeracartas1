const fs = require('fs');
const path = require('path');

const oldPath = path.join(__dirname, 'app', 'telegramgeracartas1');
const newPath = path.join(__dirname, 'app', '_telegramgeracartas1');

try {
    if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log('Successfully renamed folder to _telegramgeracartas1');
    } else {
        console.log('Folder not found:', oldPath);
    }
} catch (error) {
    console.error('Error renaming folder:', error);
}
