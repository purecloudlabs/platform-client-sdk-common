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
	"/api/v2/authorization/roles": {
		tags: ["Roles"]
	},
	"/api/v2/authorization/roles/{roleId}": {
		tags: ["Roles"],
		"delete":{
			operationId: "remove"
		},
		"get": {},
		"put": {}
	},
	"/api/v2/authorization/roles/{roleId}/users": {
		tags: ["RoleUser"],
		"get": {
			operationId: "get"
		}
	},
	"/api/v2/authorization/roles/{roleId}/users/add": {
		tags: ["RoleUser"],
		"put": {
			operationId: "add"
		}
	},
	"/api/v2/authorization/roles/{roleId}/users/remove": {
		tags: ["RoleUser"],
		"put": {
			operationId: "delete"
		}
	},
	"/api/v2/telephony/providers/edges": {},
	"/api/v2/telephony/providers/edges/{edgeId}": {},
	"/api/v2/telephony/providers/edges/{edgeId}/reboot": {
		"post": {
			operationId: "reboot"
		}
	},
	"/api/v2/telephony/providers/edges/didpools": {
		tags: ["didpools"],
	},
	"/api/v2/telephony/providers/edges/didpools/{didPoolId}":{
		tags: ["didpools"],
	},
	"/api/v2/telephony/providers/edges/dids/{didId}":{
		tags: ["dids"],
	},
	"/api/v2/telephony/providers/edges/dids":{
     tags: ["dids"]
	},
	"/api/v2/groups": {},
	"/api/v2/groups/{groupId}": {},
	"/api/v2/groups/{groupId}/members": {
		tags: ["Members"],
		"get": {
			operationId: "get"
		},
		"delete": {
			operationId: "remove"
		}
	},
	"/api/v2/locations": {},
	"/api/v2/locations/{locationId}": {},
	"/api/v2/telephony/providers/edges/phones": {
		tags: ["Phones"]
	},
	"/api/v2/telephony/providers/edges/phones/{phoneId}": {
		tags: ["Phones"]
	},
	"/api/v2/telephony/providers/edges/phones/{phoneId}/reboot": {
		tags: ["Phones"],
		"post": {
			operationId: "reboot"
		}
	},
	"/api/v2/routing/queues": {},
	"/api/v2/routing/queues/{queueId}": {},
	"/api/v2/routing/queues/{queueId}/estimatedwaittime": {
		"get": {
			operationId: "estimatedwait"
		}
	},
	"/api/v2/routing/queues/{queueId}/users": {
		tags: ["QueueUser"],
		"get": {
			operationId: "get"
		},
		"post": {
			operationId: "move"
		},
		"patch": {
			operationId: "activate"
		}
	},
	"/api/v2/routing/queues/{queueId}/users/{memberId}": {
		tags: ["QueueUser"],
		"delete": {},
		"patch": {}
	},
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
	"/api/v2/users": {},
	"/api/v2/users/{userId}": {},
	"/api/v2/users/{userId}/queues": {
		tags: ["Queue"],
		"get": {
			operationId: "get"
		},
		"patch": {
			operationId: "joinset"
		}
	},
	"/api/v2/users/{userId}/queues/{queueId}": {
		tags: ["Queue"],
		"patch": {
			operationId: "join"
		}
	},
	"/api/v2/users/{userId}/routingskills": {
		tags: ["Skill"]
	},
	"/api/v2/users/{userId}/routingskills/{skillId}": {
		tags: ["Skill"]
	},
	"/api/v2/users/{userId}/routingskills/bulk": {
		tags: ["Skill"],
		"put": {
			operationId: "bulkupdate"
		},
		"patch": {
			operationId: "bulkremove"
		}
	},
	"/api/v2/notifications/availabletopics": {
		tags: ["Topics"],
		"get": {
			operationId: "list"
		}
	},
	"/api/v2/notifications/channels": {
		tags: ["Channels"]
	},
	"/api/v2/notifications/channels/{channelId}/subscriptions": {
		tags: ["Subscriptions"],
		"get": {},
		"post": {
			operationId: "subscribe"
		},
		"delete": {}
	},
	"/api/v2/usage/query/{executionId}/results": {
		"get": {
			operationId: "results"
		}
	}
}

for (const path of Object.keys(newSwagger["paths"])) {
	if (Object.keys(inclusionList).includes(path)) {
		// Override tags if possible
		for (let value of Object.values(newSwagger["paths"][path])) {
			value.tags = inclusionList[path].tags || value.tags
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
            if (httpMethod === "tags") continue
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
