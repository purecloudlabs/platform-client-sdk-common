package cloud.genesys.webmessaging.sdk.connector.ning;

import cloud.genesys.webmessaging.sdk.connector.ApiClientConnector;
import cloud.genesys.webmessaging.sdk.connector.ApiClientConnectorProperties;
import cloud.genesys.webmessaging.sdk.connector.ApiClientConnectorProperty;
import cloud.genesys.webmessaging.sdk.connector.ApiClientConnectorProvider;
import org.asynchttpclient.AsyncHttpClient;
import org.asynchttpclient.AsyncHttpClientConfig;
import org.asynchttpclient.DefaultAsyncHttpClient;
import org.asynchttpclient.DefaultAsyncHttpClientConfig;
import org.asynchttpclient.proxy.ProxyServerSelector;
import org.asynchttpclient.util.ProxyUtils;

import java.io.IOException;
import java.net.*;
import java.util.Collections;
import java.util.List;

public class AsyncHttpClientConnectorProvider implements ApiClientConnectorProvider {
    @Override
    public ApiClientConnector create(ApiClientConnectorProperties properties) {
        DefaultAsyncHttpClientConfig.Builder builder = new DefaultAsyncHttpClientConfig.Builder();

        Integer connectionTimeout = properties.getProperty(ApiClientConnectorProperty.CONNECTION_TIMEOUT, Integer.class, null);
        if (connectionTimeout != null && connectionTimeout > 0) {
            builder.setConnectTimeout(connectionTimeout);
            builder.setReadTimeout(connectionTimeout);
            builder.setRequestTimeout(connectionTimeout);
        }

        final Proxy proxy = properties.getProperty(ApiClientConnectorProperty.PROXY, Proxy.class, null);
        if (proxy != null) {
            ProxySelector proxySelector = new ProxySelector() {
                @Override
                public List<Proxy> select(URI uri) {
                    return Collections.singletonList(proxy);
                }

                @Override
                public void connectFailed(URI uri, SocketAddress sa, IOException ioe) { }
            };
            ProxyServerSelector proxyServerSelector = ProxyUtils.createProxyServerSelector(proxySelector);
            builder.setProxyServerSelector(proxyServerSelector);
            builder.setUseProxySelector(true);
        }

        AsyncHttpClientConfig config = builder.build();
        AsyncHttpClient client = new DefaultAsyncHttpClient(config);
        return new AsyncHttpClientConnector(client);
    }
}
