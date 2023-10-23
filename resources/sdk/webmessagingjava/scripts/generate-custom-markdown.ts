import path from 'path'
import mdjd from 'mdjavadoc-api';
import fs from 'fs';

const tags = {
    author: ["Name"],
    version: ["Current Version"],
    param: ["Name", "Type", "Description"],
    "return": ["Returned Value"],
    exception: ["Exception", "Description"],
    throws: ["Exception", "Description"],
    see: ["Reference"],
    link: ["Reference"],
    since: ["Version"],
    deprecated: ["Deprecation"]
}

export class GenerateMarkdown {
    filePath = process.argv[2];
    fileName = process.argv[3];
    saveMarkdownFile = process.argv[4];

    


    init() {

        try {

            // Assign our custom version of parseFile
            mdjd.parseFile = this.parseFile

            // Parse the file into a data structure representing the javadoc comments and method declarations
            let parsedFile = mdjd.parseFile(path.join(this.filePath, this.fileName) + ".java")

            let fileOutput = `---
title: ${this.fileName}
---
## ${this.fileName}

| Method | Description |
| ------------- | ------------- |
`

            // This object keeps count of overloaded method declarations
            let methodDeclarationCount = {}
            // Output the table of contents
            for (const methodDeclaration of parsedFile) {
                if (methodDeclaration.type.length > 1 && methodDeclaration.type[1] === "class" || methodDeclaration.type[1] === "interface") {
                    continue
                }

                if (methodDeclarationCount[methodDeclaration.name]) {
                    let numberOfDeclarations = methodDeclarationCount[methodDeclaration.name][methodDeclarationCount[methodDeclaration.name].length - 1]
                    methodDeclarationCount[methodDeclaration.name].push(numberOfDeclarations + 1)
                } else {
                    methodDeclarationCount[methodDeclaration.name] = [1]
                }

                let numberOfDeclarations = methodDeclarationCount[methodDeclaration.name][methodDeclarationCount[methodDeclaration.name].length - 1]
                let description = methodDeclaration.description.replace(" \n\n", "")
                fileOutput += `| [**${methodDeclaration.name}**](${this.fileName}.html#${methodDeclaration.name}${numberOfDeclarations}) | ${description} |\n`
            }
            fileOutput += "{: class=\"table-striped\"}\n\n<h1>Constructors</h1>\n\n"

            // Output constructor descriptions
            const NumberOfConstructors = 2
            for (let i = 0; i < NumberOfConstructors; i++) {
                let constructorDeclaration = parsedFile.shift()
                fileOutput += `<a name="${constructorDeclaration.name}${methodDeclarationCount[constructorDeclaration.name].shift()}"></a>

# **${constructorDeclaration.name}**



> ${constructorDeclaration.name}(`

                if (constructorDeclaration.param) {
                    fileOutput += constructorDeclaration.param[0].values[0]
                    for (let i = 1; i < constructorDeclaration.param.length; i++) {
                        fileOutput += `, ${constructorDeclaration.param[i].values[0]}`
                    }
                }
                fileOutput += `)

${constructorDeclaration.description.replace(" \n\n", "")}`
                if (constructorDeclaration.param) {
                    fileOutput += `

### Parameters


| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
`
                    for (const param of constructorDeclaration.param) {
                        fileOutput += `| **${param.values[0]}** | **${param.values[1]}**| ${param.values[2]} |\n`
                    }
                    fileOutput += "{: class=\"table-striped\"}\n\n"
                }
            }

            fileOutput += "\n\n<h1>Methods</h1>\n\n"

            // Output method descriptions
            for (const methodDeclaration of parsedFile) {
                if (methodDeclaration.type.length > 1 && methodDeclaration.type[1] === "class" || methodDeclaration.type[1] === "interface") {
                    continue
                }

                let returnType
                if (methodDeclaration.type[0] === "private" || methodDeclaration.type[0] === "public" || methodDeclaration.type[0] === "protected") {
                    returnType = methodDeclaration.type[1]
                } else {
                    returnType = methodDeclaration.type[0]
                }

                fileOutput += `<a name="${methodDeclaration.name}${methodDeclarationCount[methodDeclaration.name].shift()}"></a>

# **${methodDeclaration.name}**



> ${returnType || ""} ${methodDeclaration.name}(`

                if (methodDeclaration.param) {
                    fileOutput += methodDeclaration.param[0].values[0]
                    for (let i = 1; i < methodDeclaration.param.length; i++) {
                        fileOutput += `, ${methodDeclaration.param[i].values[0]}`
                    }
                }
                fileOutput += `)

${methodDeclaration.description.replace(" \n\n", "")}`
                if (methodDeclaration.param) {
                    fileOutput += `

### Parameters


| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
`
                    for (const param of methodDeclaration.param) {
                        fileOutput += `| **${param.values[0]}** | **${param.values[1]}**| ${param.values[2]} |\n`
                    }
                    fileOutput += "{: class=\"table-striped\"}\n\n"
                }

                if (returnType) {
                    fileOutput += `
### Return type

**${returnType}**

`
                }
            }

            if (this.saveMarkdownFile) {
                const savePath = path.join(this.saveMarkdownFile, this.fileName) + ".md"
                console.log(`Writing markdown to ${savePath}`)
                fs.writeFileSync(savePath, fileOutput)
            }

        }

        catch (err) {
            process.exitCode = 1;
            console.log(err);
        }
    };

    parseFile(file, prefix, options) {
        if (!prefix)
            prefix = ""
        if (!options)
            options = {}
        if (!options.sourcePrefix)
            options.sourcePrefix = ".."

        let docs = []

        let fileNames = file.split("/")
        let fileName = fileNames[fileNames.length - 1]
        let content = fs.readFileSync(path.resolve(file), "utf8")
        let reg = /(?<=\s\/\*\*\s)([\s\S]*?)(?=\s\*\/\s)/g
        let match
        while ((match = reg.exec(content)) !== null) {
            let matchText = match[0]
            let startIndex = match.index + match[0].length
            startIndex += content.substring(startIndex).indexOf("\n") + 1
            let declaration = content.substring(startIndex, startIndex + content.substring(startIndex).indexOf("\n"))

            let methodDeclaration = declaration.split("(")
            let paramTypes = []
            if (methodDeclaration.length > 1) {
                let params = methodDeclaration[1].split(",")
                for (const param of params) {
                    paramTypes.push(param.trim().split(" ")[0])
                }
            }

            let type = []
            while (declaration.trim().startsWith("@")) {
                type = type.concat("@" + (/([A-Z0-9a-z]*)/g).exec(declaration.trim().substring(1))[1])

                startIndex += declaration.length + 1
                declaration = content.substring(startIndex, startIndex + content.substring(startIndex).indexOf("\n"))
            }

            type = type.concat((/([A-Z0-9a-z\.\<\> ]*)/g).exec(declaration.trim())[1].trim().split(" "))
            if (type.includes("class"))
                continue

            let doc = {
                name: type.pop(),
                description: "",
                type: type,
                source: options.sourcePrefix + "/" + prefix.split(".").join("/") + "/" + fileName + "#L" + getLineNumber(content, match.index)
            }

            let tag = null
            let lines = matchText.split("\n")
            for (let i in lines) {
                let line = lines[i].replace(/(\s)*(\*)(\s)*/g, "")
                if (line.startsWith("@")) {
                    let spaceIndex = line.search(/[ \t]/)
                    tag = line.substring(1, spaceIndex)
                    line = line.substring(spaceIndex + 1)
                    let phrase = null
                    console.log(tags)
                    if (tags[tag]) {
                        let object = {
                            content: line,
                            template: tags[tag],
                            values: []
                        }

                        let words = line.split(/[ \t]{1,}/g)
                        for (let word in words) {
                            if (phrase) {
                                if (words[word].endsWith("}")) {
                                    phrase.push(words[word].substring(0, words[word].length - 1))
                                    object.values[object.values.length - 1] += " " + parsePhrase(phrase, prefix, options.extensions ? fileName : fileName.split(".")[0])
                                    phrase = null
                                } else {
                                    phrase.push(words[word])
                                }
                            } else if (words[word].startsWith("{")) {
                                phrase = [words[word].substring(1)]
                            } else {
                                if (object.values.length < tags[tag].length) {
                                    object.values.push(words[word])
                                    if (object.values.length == 1 && paramTypes.length > 0) {
                                        object.values.push(paramTypes.pop())
                                    }
                                }
                                else object.values[object.values.length - 1] += " " + words[word]
                            }
                        }

                        if (doc[tag])
                            doc[tag].push(object)
                        else doc[tag] = [object]
                    } else tag = null
                } else if (tag) {
                    let object = doc[tag][doc[tag].length - 1]
                    let words = line.split(/[ \t]{1,}/g)
                    for (let word in words) {
                        if (object.values.length < tags[tag].length)
                            object.values.push(words[word])
                        else object.values[object.values.length - 1] += " " + words[word]
                    }
                } else {
                    if (line.trim().length > 0) {
                        let words = line.trim().split(/[\s]{1,}/g)
                        let phrase = null
                        for (let word in words) {
                            if (phrase !== null) {
                                if (words[word].includes("}")) {
                                    phrase.push(words[word].substring(0, words[word].indexOf("}")))
                                    doc.description += parsePhrase(phrase, prefix, options.extensions ? this.fileName : this.fileName.split(".")[0]) + words[word].substring(words[word].indexOf("}") + 1)
                                    phrase = null
                                } else {
                                    phrase.push(words[word])
                                }
                            } else if (words[word].startsWith("{@")) {
                                phrase = [words[word].substring(2)]
                            } else {
                                doc.description += words[word] + " "
                            }
                        }
                    }
                    doc.description += "\n"
                }
            }
            docs.push(doc)
        }

        return docs
    }



    

}


// Call the method directly
const generateMarkdown = new GenerateMarkdown();
generateMarkdown.init();


function parsePhrase(phrase, prefix, fileName): string {
    let tag = phrase.shift()
    if ((tag == "see" || tag == "link") && phrase.length == 2) {
        let strings = phrase.shift().split("#")
        let prefixes = []
        if (strings[0].length > 0)
            prefixes = strings[0].split(".")
        else if (prefix && prefix.length > 0)
            prefixes = prefix.split(".")

        if (fileName)
            prefixes.push(fileName)

        return "[" + phrase.join(" ") + "](" + prefixes.join("/") + "#" + strings[1] + ")"
    } else {
        phrase.shift()
        return phrase.join(" ")
    }
}

function getLineNumber(content, index): number {
    let line = 1
    for (let i = 0; i < content.length && i <= index; i++) {
        if (content.charAt(i) == '\n')
            line++
    }

    return line
}

/**
 * Custom version of parseFile to get method parameter types
 */
