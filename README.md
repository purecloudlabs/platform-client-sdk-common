# PureCloud Platform Client SDKs

This repository contains scripts, templates, and configuration files that are used in the process of auto generating PureCloud Platform API client libraries based on the API's [swagger definition](https://api.mypurecloud.com/api/v2/docs/swagger).

## SDK Repos

* [Java](https://github.com/MyPureCloud/platform-client-sdk-java)
* [Javascript](https://github.com/MyPureCloud/platform-client-sdk-javascript)
* [.NET](https://github.com/MyPureCloud/platform-client-sdk-dotnet)
* [Python](https://github.com/MyPureCloud/platform-client-sdk-python)
* [Ruby](https://github.com/MyPureCloud/platform-client-sdk-ruby)
* [WebMessaging (Java)](https://github.com/MyPureCloud/web-messaging-sdk-java)

**Note:  As of 9.17.2020 - Genesys Cloud has deprecated Ruby SDK support.  The Genesys Cloud team will keep a branch ([FROZEN-LAST-VERSION-RUBY-SDK-GENERATION](https://github.com/purecloudlabs/platform-client-sdk-common/tree/FROZEN-LAST-VERSION-RUBY-SDK-GENERATION)) for the Ruby SDK generation process, but the Ruby SDK code generation will be removed from the main branch in this repository.**

# Generating the SDK locally

For additional information and documentation, see [Building Locally](https://github.com/purecloudlabs/platform-client-sdk-common/wiki/Building-Locally) in the [wiki](https://github.com/MyPureCloud/platform-client-sdk-common/wiki).

## Dependencies

* [Node.js](https://nodejs.org/en/) with NPM
* [Java 8](http://www.oracle.com/technetwork/java/javase/overview/java8-2100321.html)

## Config files

Each SDK configuration has a config file located at `./resources/sdk/<language>/config.json`. This contains all of the general configuration required to build the SDK.

A local config file is typically desired to store sensitive information (like a PureCloud client ID and secret) or to override settings in the standard config file.

For full documentation, see [Config Files](https://github.com/MyPureCloud/platform-client-sdk-common/wiki/Config-Files) on the wiki.

## Generate

First, from this repo's directory, install dependencies:

```
npm install
```

Then start the build process by specifying which SDK to build. This command will look in `./resources/sdk/<language>` to find the primary config file (`config.json` or `config.yaml`) and a local config file (`localConfig.json` or `localConfig.yaml`). If a JSON and YAML config file exist, the JSON file will be preferred.

```
npx tsx sdkBuilder.ts --sdk purecloudjava
```

The above command is equivalent to providing these paths to config files (assuming JSON files exist):

```
npx tsx sdkBuilder.ts --config ./resources/sdk/purecloudjava/config.json --localconfig ./resources/sdk/purecloudjava/localConfig.json
```
