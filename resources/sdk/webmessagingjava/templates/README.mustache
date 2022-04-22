---
title: Web Messaging SDK - Java
---

## Resources

[![web-messaging-sdk](https://maven-badges.herokuapp.com/maven-central/cloud.genesys/web-messaging-sdk/badge.svg)](https://maven-badges.herokuapp.com/maven-central/cloud.genesys/web-messaging-sdk)

* **Documentation** https://developer.mypurecloud.com/api/rest/client-libraries/web-messaging-java/
* **Source** https://github.com/MyPureCloud/web-messaging-sdk-java

## Install Using maven

Install the library from maven via the package [cloud.genesys:web-messaging-sdk](https://mvnrepository.com/artifact/cloud.genesys/web-messaging-sdk)

## Using the SDK

### Referencing the Package

Import the necessary packages:

```{"language":"java"}
import cloud.genesys.webmessaging.sdk.GenesysCloudRegionWebSocketHosts;
import cloud.genesys.webmessaging.sdk.WebMessagingException;
import cloud.genesys.webmessaging.sdk.WebMessagingClient;
import cloud.genesys.webmessaging.sdk.model.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
```

### Creating a chat

The web messaging APIs do not require standard Genesys Cloud authentication, but do require a token for all API calls other than creating a new chat. This is handled transparently if you don't require a custom `ApiClient`  

```{"language":"java"}
// Configure session listener
WebMessagingClient.SessionListener sessionListener = new WebMessagingClient.SessionListener() {

    @Override
    public void sessionResponse(SessionResponse sessionResponse, String s) {
        //Do stuff here

    }

    @Override
    public void structuredMessage(StructuredMessage structuredMessage, String s) {

    }

    @Override
    public void presignedUrlResponse(PresignedUrlResponse presignedUrlResponse, String s) {

    }

    @Override
    public void uploadSuccessEvent(UploadSuccessEvent uploadSuccessEvent, String s) {

    }

    @Override
    public void uploadFailureEvent(UploadFailureEvent uploadFailureEvent, String s) {

    }

    @Override
    public void connectionClosedEvent(ConnectionClosedEvent connectionClosedEvent, String s) {

    }

    @Override
    public void sessionExpiredEvent(SessionExpiredEvent sessionExpiredEvent, String s) {

    }

    @Override
    public void jwtResponse(JwtResponse jwtResponse, String s) {

    }

    @Override
    public void unexpectedMessage(BaseMessage baseMessage, String s) {

    }

    @Override
    public void webSocketConnected() {

    }

    @Override
    public void webSocketDisconnected(int i, String s) {

    }
};

// Instantiate WebMessagingClient
GenesysCloudRegionWebSocketHosts webSocketHost = GenesysCloudRegionWebSocketHosts.us_east_1;
WebMessagingClient client = new WebMessagingClient(webSocketHost);

// Add the session listener
client.addSessionListener(sessionListener);

// Connect to the websocket
String deploymentId = "df2ad262-7fe2-4fb2-9a83-e34be463713a";
String origin = "app.mypurecloud.com";
client.connect(deploymentId, origin);

// Configure a new session
client.configureSession(deploymentId,origin);

// Send message
client.sendMessage("The quick brown fox jumps over the lazy dog");

// Send message with custom attributes
Map<String, String> customAttributes = Map.of(
    "customerAccountId", "079fd5fe-03f8-434d-a2cb-0a9946849bd6",
    "customerName", "John Doe"
);

client.sendMessage("The quick brown fox jumps over the lazy dog", customAttributes);

// Disconnect from conversation
client.disconnect();

```

#### Setting the environment

Provide the full web socket url if not using one provided in `GenesysCloudRegionWebSocketHosts`:

```{"language":"java"}
WebMessagingClient client = new WebMessagingClient("wss://webmessaging.mypurecloud.ie/v1");
```

### Building a custom ApiClient Instance

If you want to use your own ApiClient you can build it with the access token and set it in the `WebMessagingClient`  

`ApiClient` implements a builder pattern to construct new instances:

```{"language":"java"}
// Create ApiClient instance
// Set Region
PureCloudRegionHosts region = PureCloudRegionHosts.us_east_1;
ApiClient apiClient = ApiClient.Builder.standard()
		.withAccessToken(accessToken)
		.withBasePath(region)
		.build();

// Set it in the WebMessagingClient
client.setApiClient(apiClient);
```

#### Setting the environment

Provide the full base url if not using one provided in `GenesysCloudRegionHosts`:

```{"language":"java"}
.withBasePath("https://api.mypurecloud.ie")
```

#### Setting the HTTP connector

The SDK supports the following HTTP connectors:

* Apache (_default_, synchronous), use `ApacheHttpClientConnectorProvider`
* OkHTTP (synchronous), use `OkHttpClientConnectorProvider`

Specify the connector in the builder:

```{"language":"java"}
.withProperty(ApiClientConnectorProperty.CONNECTOR_PROVIDER, new OkHttpClientConnectorProvider())
```

#### Setting the max retry time

By default, the Java Web Messaging SDK does not automatically retry any failed requests.
To enable automatic retries, provide a `RetryConfiguration` object with the maximum number of seconds to retry requests when building the `ApiClient` instance.

Building a `RetryConfiguration` instance:  
```{"language":"java"}
ApiClient.RetryConfiguration retryConfiguration = new ApiClient.RetryConfiguration();
retryConfiguration.setMaxRetryTimeSec(30);
```

Setting `RetryConfiguration` instance to `ApiClient`:
```{"language":"java"}
.withRetryConfiguration(retryConfiguration)
```
Set the `maxRetryTimeSec` to the number of seconds to process retries before returning an error.
When the retry time is a a positive integer, the SDK will follow the recommended backoff logic using the provided configuration.
The best practices are documented in the [Rate Limiting](https://developer.mypurecloud.com/api/rest/rate_limits.html) Developer Center article.

#### Other ApiClient.Builder methods

* `withDefaultHeader(String header, String value)` Specifies additional headers to be sent with every request
* `withUserAgent(String userAgent)` Overrides the default user agent header
* `withObjectMapper(ObjectMapper objectMapper)` Overrides the default `ObjectMapper` used for deserialization
* `withDateFormat(DateFormat dateFormat)` Overrides the default `DateFormat`
* `withConnectionTimeout(int connectionTimeout)` Overrides the default connection timeout
* `withShouldThrowErrors(boolean shouldThrowErrors)` Set to `false` to suppress throwing of all errors
* `withProxy(Proxy proxy)` Sets a proxy to use for requests
* `withAuthenticatedProxy(Proxy proxy, String user, String pass)` Sets an authenticated proxy to use for requests

## SDK Source Code Generation

The SDK is automatically regenerated and published from the API's definition after each API release. For more information on the build process, see the [platform-client-sdk-common](https://github.com/MyPureCloud/platform-client-sdk-common) project.


## Versioning

The SDK's version is incremented according to the [Semantic Versioning Specification](https://semver.org/). The decision to increment version numbers is determined by [diffing the Platform API's swagger](https://github.com/purecloudlabs/platform-client-sdk-common/blob/master/modules/swaggerDiff.js) for automated builds, and optionally forcing a version bump when a build is triggered manually (e.g. releasing a bugfix).


## Support

This package is intended to be forwards compatible with v2 of Genesys Cloud's Platform API. While the general policy for the API is not to introduce breaking changes, there are certain additions and changes to the API that cause breaking changes for the SDK, often due to the way the API is expressed in its swagger definition. Because of this, the SDK can have a major version bump while the API remains at major version 2. While the SDK is intended to be forward compatible, patches will only be released to the latest version. For these reasons, it is strongly recommended that all applications using this SDK are kept up to date and use the latest version of the SDK.

For any issues, questions, or suggestions for the SDK, visit the [Genesys Cloud Developer Forum](https://developer.mypurecloud.com/forum/).
