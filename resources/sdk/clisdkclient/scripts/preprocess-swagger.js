const fs = require('fs')
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
}

let paths = {}
const inclusionList = {
	"/api/v2/outbound/campaigns": {},
	"/api/v2/outbound/campaigns/{campaignId}": {},
	"/api/v2/authorization/divisions": {
		tags: ["Authorization"]
	},
	"/api/v2/authorization/divisions/{divisionId}": {
		tags: ["Authorization"]
	},
	"/api/v2/telephony/providers/edges": {},
	"/api/v2/telephony/providers/edges/{edgeId}": {},
	"/api/v2/groups": {},
	"/api/v2/groups/{groupId}": {},
	"/api/v2/locations": {},
	"/api/v2/locations/{locationId}": {},
	"/api/v2/telephony/providers/edges/phones": {
		tags: ["Phones"]
	},
	"/api/v2/telephony/providers/edges/phones/{phoneId}": {
		tags: ["Phones"]
	},
	"/api/v2/routing/queues": {},
	"/api/v2/routing/queues/{queueId}": {},
	"/api/v2/telephony/providers/edges/sites": {
		tags: ["Sites"]
	},
	"/api/v2/telephony/providers/edges/sites/{siteId}": {
		tags: ["Sites"]
	},
	"/api/v2/routing/skills": {
		tags: ["Skills"]
	},
	"/api/v2/routing/skills/{skillId}": {
		tags: ["Skills"]
	},
	"/api/v2/stations": {},
	"/api/v2/stations/{stationId}": {},
	"/api/v2/usage/query": {},
	"/api/v2/usage/query/{executionId}/results": {},
	"/api/v2/users": {},
	"/api/v2/users/{userId}": {}
}

for (const path of Object.keys(newSwagger["paths"])) {
	if (Object.keys(inclusionList).includes(path)) {
		for (let value of Object.values(newSwagger["paths"][path])) {
			// Override tags if possible
			value.tags = inclusionList[path].tags || value.tags
		}
		// Override methods if possible
		if (inclusionList[path].methods !== undefined) {
			paths[path] = {}
			for (const method of inclusionList[path].methods) {
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
		var file = childProcess.execFileSync('curl', ['--silent', '-L', url], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 12 })
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
