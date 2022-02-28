const fs = require('fs');
const path = require('path');

const rootDir = process.argv[2];
const dataFileName = process.argv[3];

let dataFile = {};

const dir = fs.opendirSync(rootDir);
let dirent;
console.log('combineApiDataFiles.js Dir', dir);
while ((dirent = dir.readSync()) !== null) {
    const nameLowerCase = dirent.name.toLowerCase();
    const apiName = nameLowerCase.replace('api.json', '');
    console.log('NAME LOWER CASE', nameLowerCase);
    if (!nameLowerCase.endsWith('api.json')) continue;

    const filePath = path.join(rootDir, dirent.name);
    let apiFile = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log('API FILE', apiFile);
    dataFile[apiName] = {};
    for (const key of Object.keys(apiFile)) {
        dataFile[apiName][key] = apiFile[key];
    }
    fs.unlinkSync(filePath);
}
dir.closeSync();

fs.writeFileSync(dataFileName, JSON.stringify(dataFile, null, 2));
