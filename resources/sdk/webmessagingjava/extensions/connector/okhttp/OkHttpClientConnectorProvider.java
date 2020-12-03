package cloud.genesys.webmessaging.sdk.connector.okhttp;

import cloud.genesys.webmessaging.sdk.connector.ApiClientConnector;
import cloud.genesys.webmessaging.sdk.connector.ApiClientConnectorProperties;
import cloud.genesys.webmessaging.sdk.connector.ApiClientConnectorProperty;
import cloud.genesys.webmessaging.sdk.connector.ApiClientConnectorProvider;
import com.squareup.okhttp.Dispatcher;
import com.squareup.okhttp.OkHttpClient;

import java.net.Proxy;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;

public class OkHttpClientConnectorProvider implements ApiClientConnectorProvider {
    @Override
    public ApiClientConnector create(ApiClientConnectorProperties properties) {
        OkHttpClient client = new OkHttpClient();

        Integer connectionTimeout = properties.getProperty(ApiClientConnectorProperty.CONNECTION_TIMEOUT, Integer.class, null);
        if (connectionTimeout != null && connectionTimeout > 0) {
            client.setConnectTimeout(connectionTimeout, TimeUnit.MILLISECONDS);
            client.setReadTimeout(connectionTimeout, TimeUnit.MILLISECONDS);
            client.setWriteTimeout(connectionTimeout, TimeUnit.MILLISECONDS);
        }

        Proxy proxy =properties.getProperty(ApiClientConnectorProperty.PROXY, Proxy.class, null);
        if (proxy != null) {
            client.setProxy(proxy);
        }

        ExecutorService executorService = properties.getProperty(ApiClientConnectorProperty.ASYNC_EXECUTOR_SERVICE, ExecutorService.class, null);
        if (executorService != null) {
            client.setDispatcher(new Dispatcher(executorService));
        }

        return new OkHttpClientConnector(client);
    }
}
