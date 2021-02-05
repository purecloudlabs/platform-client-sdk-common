const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')

const newSwaggerPath = process.argv[2]
const saveNewSwaggerPath = process.argv[3]

let newSwagger
// Retrieve new swagger
if (fs.existsSync(newSwaggerPath)) {
    console.log(`Loading new swagger from disk: ${newSwaggerPath}`)
    newSwagger = JSON.parse(fs.readFileSync(newSwaggerPath, 'utf8'))
} else if (newSwaggerPath.toLowerCase().startsWith('http')) {
    console.log(`Downloading new swagger from: ${newSwaggerPath}`)
    newSwagger = JSON.parse(downloadFile(newSwaggerPath))
} else {
	console.log(`Invalid newSwaggerPath: ${newSwaggerPath}`)
	process.exit(1)
}

const httpMethods = ["get", "delete", "put", "patch", "post"]
const definitionsPath = path.join(path.dirname(require.main.filename), "../resources/resourceDefinitions.json")
const inclusionList = JSON.parse(fs.readFileSync(definitionsPath, 'utf8'))

let paths = {}
for (const path of Object.keys(newSwagger["paths"])) {
	if (Object.keys(inclusionList).includes(path)) {
		// Override tags if possible
		for (let value of Object.values(newSwagger["paths"][path])) {
			value.tags = inclusionList[path].tag !== undefined ? [inclusionList[path].tag] : [value.tags[0]]
		}

		// Override operationId if possible
		for (const method of Object.keys(newSwagger["paths"][path])) {
			if (!Object.keys(inclusionList[path]).includes(method)) continue
			if (inclusionList[path][method].operationId !== undefined) {
				newSwagger["paths"][path][method].operationId = `SWAGGER_OVERRIDE_${inclusionList[path][method].operationId}`
			}
		}

		// Exclude HTTP methods if possible
		let includedMethods = []
        for (const httpMethod of Object.keys(inclusionList[path])) {
            if (!httpMethods.includes(httpMethod)) continue
            includedMethods.push(httpMethod)
        }

		paths[path] = {}
		if (includedMethods.length > 0) {
			for (const method of includedMethods) {
				paths[path][method] = newSwagger["paths"][path][method]
			}
		} else {
			paths[path] = newSwagger["paths"][path]
		}
	}
}
newSwagger["paths"] = paths

if (saveNewSwaggerPath) {
    console.log(`Writing new swagger to ${saveNewSwaggerPath}`)
    fs.writeFileSync(saveNewSwaggerPath, JSON.stringify(newSwagger))
}

function downloadFile(url) {
	var i = 0
	while (i < 10) {
		i++
		console.log(`Downloading file: ${url}`)
		// Source: https://www.npmjs.com/package/download-file-sync
		var file = childProcess.execFileSync('curl', ['--silent', '-L', url], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 })
		if (!file || file === '') {
			console.log(`File was empty! sleeping for 5 seconds. Retries left: ${10 - i}`)
			childProcess.execFileSync('curl', ['--silent', 'https://httpbin.org/delay/10'], { encoding: 'utf8' })
		} else {
			return file
		}
	}
	console.log('Failed to get contents for file!')
	return null
}
