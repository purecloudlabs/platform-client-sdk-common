package cloud.genesys.webmessaging.sdk.connector.okhttp;

import cloud.genesys.webmessaging.sdk.connector.ApiClientConnector;
import cloud.genesys.webmessaging.sdk.connector.ApiClientConnectorProperties;
import cloud.genesys.webmessaging.sdk.connector.ApiClientConnectorProperty;
import cloud.genesys.webmessaging.sdk.connector.ApiClientConnectorProvider;
import okhttp3.OkHttpClient;

import java.net.Proxy;
import java.util.concurrent.TimeUnit;

public class OkHttpClientConnectorProvider implements ApiClientConnectorProvider {
    @Override
    public ApiClientConnector create(ApiClientConnectorProperties properties) {
        OkHttpClient.Builder builder = new OkHttpClient().newBuilder();

        Integer connectionTimeout = properties.getProperty(ApiClientConnectorProperty.CONNECTION_TIMEOUT, Integer.class, null);
        if (connectionTimeout != null && connectionTimeout > 0) {
            builder.connectTimeout(connectionTimeout, TimeUnit.MILLISECONDS);
            builder.readTimeout(connectionTimeout, TimeUnit.MILLISECONDS);
            builder.writeTimeout(connectionTimeout, TimeUnit.MILLISECONDS);
        }

        Proxy proxy = properties.getProperty(ApiClientConnectorProperty.PROXY, Proxy.class, null);
        if (proxy != null) {
            builder.proxy(proxy);
        }

        return new OkHttpClientConnector(builder.build());
    }
}
