const dot = require('dot');
const fs = require('fs-extra');
const path = require('path');

try {
    dot.templateSettings.strip = false;

    const rootPath = path.resolve(process.argv[2]);
    let version = require(path.resolve(process.argv[3]));
    version = version.displayFull;

    let newRootPath = fs.readdirSync(rootPath).map(fileName => {
        if (fileName === "purecloud-platform-client-v2") {
            return path.join(rootPath + "/", fileName);
        }
        if (fileName === "purecloud-platform-client-internal-v2") {
            return path.join(rootPath + "/", fileName);
        }
    });

    const apiDirPath = newRootPath + "/api";
    const indexJsPath = newRootPath + "/index.js";
    const rootDirName = newRootPath.toString().split("/").pop();

    console.log(`rootPath=${newRootPath}`);
    console.log(`apiDirPath=${apiDirPath}`);
    console.log(`indexJsPath=${indexJsPath}`);

    let imports = [];
    let classInstances =[];

    const dir = fs.opendirSync(apiDirPath);
    let dirent;
    while ((dirent = dir.readSync()) !== null) {
        let fileName = dirent.name.slice(0, -3);
        imports.push(getImportTemplateString(fileName));
        classInstances.push(getClassInstanceTemplateString(fileName, rootDirName));
    }
    dir.closeSync();

    imports.sort();
    classInstances.sort();

    const templateString = getIndexJsTemplateString();
    const jsDoc = getJsDoc(version, rootDirName);

    writeTemplate(templateString, { imports: imports.join('\n'), classInstances: classInstances.join('\n\t\t'), version: version, jsDoc: jsDoc, moduleName: rootDirName }, indexJsPath);
} catch (err) {
    process.exitCode = 1;
    console.log(err);
}

function getIndexJsTemplateString() {
    return `import PureCloudRegionHosts from './PureCloudRegionHosts.js';
import ApiClient from './ApiClient.js';
{{=it.imports}}

{{=it.jsDoc}}
class platformClient {
    constructor() {
        /**
         * The ApiClient constructor.
         * @property {module:{{=it.moduleName}}/ApiClient}
         */
        this.ApiClient = new ApiClient();
        /**
         * The ApiClient class.
         * @property {module:{{=it.moduleName}}/ApiClient}
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

function getImportTemplateString(fileName) {
    return `import ${fileName} from './api/${fileName}.js';`
}

function getClassInstanceTemplateString(fileName, rootDirName) {
    return `/**
\t\t * The ${fileName} service constructor.
\t\t * @property {module:${rootDirName}/api/${fileName}
\t\t */
\t\tthis.${fileName} = ${fileName}`;
}

function getJsDoc(version, rootDirName) {
    return `/**
 * A JavaScript library to interface with the PureCloud Platform API.<br>
 * The <code>index</code> module provides access to constructors for all the classes which comprise the public API.
 * <p>
 * An AMD (recommended!) or CommonJS application will generally do something equivalent to the following:
 * <pre>
 * var platformClient = require('${rootDirName}/index'); // See note below*.
 * var xxxSvc = new platformClient.XxxApi(); // Allocate the API class we're going to use.
 * var yyyModel = new platformClient.Yyy(); // Construct a model instance.
 * yyyModel.someProperty = 'someValue';
 * ...
 * var zzz = xxxSvc.doSomething(yyyModel); // Invoke the service.
 * ...
 * </pre>
 * <em>*NOTE: For a top-level AMD script, use require(['${rootDirName}/index'], function(){...})
 * and put the application logic within the callback function.</em>
 * </p>
 * <p>
 * A non-AMD browser application (discouraged) might do something like this:
 * <pre>
 * var xxxSvc = new platformClient.XxxApi(); // Allocate the API class we're going to use.
 * var yyy = new platformClient.Yyy(); // Construct a model instance.
 * yyyModel.someProperty = 'someValue';
 * ...
 * var zzz = xxxSvc.doSomething(yyyModel); // Invoke the service.
 * ...
 * </pre>
 * </p>
 * @module ${rootDirName}/index
 * @version ${version}
 */`;
}

function writeTemplate(templateString, templateObj, filePath) {
    let template = dot.template(templateString, null, templateObj);
    let result = template(templateObj);
    fs.writeFileSync(filePath, result);
    console.log(`Extension templated to ${filePath}`);
}