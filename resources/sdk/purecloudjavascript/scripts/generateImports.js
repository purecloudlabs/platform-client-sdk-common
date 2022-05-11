const dot = require('dot');
const fs = require('fs-extra');
const path = require('path');

try {
    dot.templateSettings.strip = false;
    const rootPath = path.resolve(process.argv[2]);
    const apiDirPath = rootPath + "/api";
    const indexPath = rootPath + "/index.js";
    const rootDirName = rootPath.split('/').pop();

    console.log(`rootPath=${rootPath}`);
    console.log(`apiDirPath=${apiDirPath}`);
    console.log(`indexPath=${indexPath}`);

    let imports = [];
    let classInstances =[];

    const dir = fs.opendirSync(apiDirPath);
    let dirent;
    while ((dirent = dir.readSync()) !== null) {
        let fileName = dirent.name.slice(0, -3);
        imports.push(`import ${fileName} from './api/${fileName}.js';`);
        classInstances.push(getClassInstanceTemplateString(fileName, rootDirName));
    }
    dir.closeSync();

    imports.sort();
    classInstances.sort();

    const templateString = getTemplateString();

    writeTemplate(templateString, { imports: imports.join('\n'), classInstances: classInstances.join('\n') }, indexPath);
} catch (err) {
    process.exitCode = 1;
    console.log(err);
}

function getTemplateString() {
    return `import PureCloudRegionHosts from './PureCloudRegionHosts.js';
import ApiClient from './ApiClient.js';
{{=it.imports}}

class platformClient {
    constructor() {
        /**
         * The ApiClient constructor.
         * @property {module:purecloud-platform-client-v2/ApiClient}
         */
        this.ApiClient = new ApiClient();
        /**
         * The ApiClient class.
         * @property {module:purecloud-platform-client-v2/ApiClient}
         */
        this.ApiClientClass = ApiClient;
        {{=it.classInstances}}
        /**
         * The PureCloudRegionsHost Object.
         * @property {module:purecloud-platform-client-v2/MyPureCloudRegionHost}
         */
        this.PureCloudRegionHosts = PureCloudRegionHosts;
    }
}

//export default platformClient;
export default new platformClient();`
}

function getClassInstanceTemplateString(fileName, rootFileName) {
    return `\t\t/**
\t\t * The ${fileName} service constructor.
\t\t * @property {module:${rootFileName}/api/${fileName}
\t\t */
\t\tthis.${fileName} = ${fileName}`;
}

function writeTemplate(templateString, templateObj, filePath) {
    let template = dot.template(templateString, null, templateObj);
    let result = template(templateObj);
    fs.writeFileSync(filePath, result);
    console.log(`Extension templated to ${filePath}`);
}