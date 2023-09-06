import fs from 'fs-extra';
import path from 'path';

export class ReplaceProperties {
    init() {
		try {
            var propertiesFilePath = path.resolve(process.argv[2])
            var pomFilePath = path.resolve(process.argv[3])
        
            const propertiesFile = fs.readFileSync(propertiesFilePath, "utf-8")
            const propertiesFileSplit = propertiesFile.replace(/props.[a-zA-Z]{0,}\=/g, "").split("\n")
            var pomFile = fs.readFileSync(pomFilePath, "utf-8")
                .replace(/\$\{name\}|\$\{props.name\}/g, propertiesFileSplit[0])
                .replace(/\$\{version\}|\$\{props.version\}/g, propertiesFileSplit[1])
                .replace(/\$\{description\}|\$\{props.description\}/g, propertiesFileSplit[2])
                .replace(/\$\{url\}|\$\{props.url\}/g, propertiesFileSplit[3])
            fs.writeFileSync(pomFilePath, pomFile)
        } catch (err) {
            console.log(err)
        }
    };
}

const replaceProperties = new ReplaceProperties();
replaceProperties.init();