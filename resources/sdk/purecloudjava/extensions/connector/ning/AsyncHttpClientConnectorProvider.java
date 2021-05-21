package com.mypurecloud.sdk.v2.connector.ning;

import com.mypurecloud.sdk.v2.connector.ApiClientConnector;
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorProperties;
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorProperty;
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorProvider;
import org.asynchttpclient.AsyncHttpClient;
import org.asynchttpclient.AsyncHttpClientConfig;
import org.asynchttpclient.DefaultAsyncHttpClient;
import org.asynchttpclient.DefaultAsyncHttpClientConfig;
import org.asynchttpclient.proxy.ProxyServerSelector;
import org.asynchttpclient.util.ProxyUtils;
import static org.asynchttpclient.Dsl.proxyServer;


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
            ProxyServerSelector proxyServerSelector = createProxyServerSelector(proxySelector);
            builder.setProxyServerSelector(proxyServerSelector);
            builder.setUseProxySelector(true);
        }

        AsyncHttpClientConfig config = builder.build();
        AsyncHttpClient client = new DefaultAsyncHttpClient(config);
        return new AsyncHttpClientConnector(client);
    }

    /*
     * method source: https://github.com/AsyncHttpClient/async-http-client/blob/9b7298b8f1cb41fed5fb5a1315267be323c875d6/client/src/main/java/org/asynchttpclient/util/ProxyUtils.java
     */
    public ProxyServerSelector createProxyServerSelector(final ProxySelector proxySelector) {
        return uri -> {
            try {
              URI javaUri = uri.toJavaNetURI();
    
              List<Proxy> proxies = proxySelector.select(javaUri);
              if (proxies != null) {
                // Loop through them until we find one that we know how to use
                for (Proxy proxy : proxies) {
                  switch (proxy.type()) {
                    case HTTP:
                      if (!(proxy.address() instanceof InetSocketAddress)) {
                        return null;
                      } else {
                        InetSocketAddress address = (InetSocketAddress) proxy.address();
                        return proxyServer(address.getHostString(), address.getPort()).build();
                      }
                    case DIRECT:
                      return null;
                    default:
                      break;
                  }
                }
              }
              return null;
            } catch (URISyntaxException e) {
              return null;
            }
        };
      }
}
