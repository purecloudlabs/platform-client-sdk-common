Clone these repos locally:

* SDK Common: https://github.com/MyPureCloud/purecloud_api_sdk_common
* Internal Config: https://bitbucket.org/inindca/purecloud-api-sdk-internal-config
* Swagger Codegen: https://github.com/MyPureCloud/swagger-codegen

CD to the swagger-codegen dir and run `mvn clean package`

CD to the SDK common dir and run `npm install` and then:

```
node sdkBuilder.js --config /git/purecloud-api-sdk-internal-config/java/config.json --localconfig /git/purecloud-api-sdk-internal-config/java/localConfig.yml 
```

Adjust the paths for your environment. I clone my repos to /git. I typically put the command in a shell script for easy reuse.

Here's my `localConfig.yml` file. 

* Update WORKSPACE to the root where your repos exist
* Update INTERNAL_CONFIG_REPO_PATH if you used a different dirname
* Set mavenSettingsFilePath="", I think. That file intends to contain credentials for publishing, but it should be fine if you set it to an empty string. Let me know if it doesn't work correctly without it.


```
---
envVars:
  local:
    WORKSPACE: '/git'
    INCREMENT_POINT: true
    RELEASE_NOTES: "# Extra stuff\n\n* thing 1\n* thing 2"
  internalBuild:
    INTERNAL_CONFIG_REPO_PATH: "${WORKSPACE}/purecloud-api-sdk-internal-config"
  pureCloudDCA:
    PURECLOUD_CLIENT_ID: "cfd8b0f4-ffd2-4fdc-9f0c-4f5b4018d973"
    PURECLOUD_CLIENT_SECRET: "-P_DZszdDhWtf_lE6H9u7QLAhfi4K6irQ4pS38rT9Cg"
    PURECLOUD_ENVIRONMENT: "inindca.com"
  standard:
    DPGP_PASSPHRASE: "D0gf00d"
overrides:
  settings:
    enableLoggerColor: true
    mavenSettingsFilePath: "${WORKSPACE}/settings.xml"
    sdkRepo: 
      repo: "https://bitbucket.org/inindca/purecloud-api-sdk-java-internal"
  stageSettings:
    postbuild:
      gitCommit: false
      publishRelease: false
      postRunScripts: []
```