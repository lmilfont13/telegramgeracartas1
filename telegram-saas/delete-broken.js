const fs = require('fs');
const path = require('path');

const target1 = path.join(__dirname, 'app', 'telegramgeracartas1');
const target2 = path.join(__dirname, 'app', '_telegramgeracartas1');

function deleteFolder(target) {
    try {
        if (fs.existsSync(target)) {
            console.log(`Deleting ${target}...`);
            fs.rmSync(target, { recursive: true, force: true });
            console.log('Deleted successfully.');
        } else {
            console.log(`Folder not found: ${target}`);
        }
    } catch (error) {
        console.error(`Error deleting ${target}:`, error);
    }
}

deleteFolder(target1);
deleteFolder(target2);
