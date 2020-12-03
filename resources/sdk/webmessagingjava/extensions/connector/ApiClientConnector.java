package cloud.genesys.webmessaging.sdk.connector;

import cloud.genesys.webmessaging.sdk.AsyncApiCallback;

import java.io.IOException;
import java.util.concurrent.Future;

public interface ApiClientConnector extends AutoCloseable {
    ApiClientConnectorResponse invoke(ApiClientConnectorRequest request) throws IOException;
    Future<ApiClientConnectorResponse> invokeAsync(ApiClientConnectorRequest request, AsyncApiCallback<ApiClientConnectorResponse> callback);
}
