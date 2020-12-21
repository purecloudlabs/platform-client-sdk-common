package cloud.genesys.webmessaging.sdk.connector.apache;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import cloud.genesys.webmessaging.sdk.DetailLevel;
import cloud.genesys.webmessaging.sdk.connector.ApiClientConnector;
import cloud.genesys.webmessaging.sdk.connector.ApiClientConnectorProperties;
import cloud.genesys.webmessaging.sdk.connector.ApiClientConnectorProperty;
import cloud.genesys.webmessaging.sdk.connector.ApiClientConnectorProvider;
import org.apache.http.HttpHost;
import org.apache.http.HttpRequestInterceptor;
import org.apache.http.HttpResponseInterceptor;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.impl.client.HttpClients;

import java.net.InetSocketAddress;
import java.net.Proxy;
import java.net.SocketAddress;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ApacheHttpClientConnectorProvider implements ApiClientConnectorProvider {
    @Override
    public ApiClientConnector create(ApiClientConnectorProperties properties) {
        RequestConfig.Builder requestBuilder = RequestConfig.custom();

        Integer connectionTimeout = properties.getProperty(ApiClientConnectorProperty.CONNECTION_TIMEOUT, Integer.class, null);
        if (connectionTimeout != null && connectionTimeout > 0) {
            requestBuilder = requestBuilder.setConnectTimeout(connectionTimeout)
                    .setSocketTimeout(connectionTimeout)
                    .setConnectionRequestTimeout(connectionTimeout);
        }

        Proxy proxy = properties.getProperty(ApiClientConnectorProperty.PROXY, Proxy.class, null);
        ApacheHttpCredentialsProvider credentialsProvider = null;
        if (proxy != null) {
            SocketAddress address = proxy.address();
            if (address instanceof InetSocketAddress) {
                InetSocketAddress inetAddress = (InetSocketAddress)address;
                HttpHost proxyHost = new HttpHost(inetAddress.getAddress(), inetAddress.getPort());
                requestBuilder.setProxy(proxyHost);

                String user = properties.getProperty(ApiClientConnectorProperty.PROXY_USER, String.class, null);
                String pass = properties.getProperty(ApiClientConnectorProperty.PROXY_PASS, String.class, null);
                if (user != null && pass != null) {
                    credentialsProvider = new ApacheHttpCredentialsProvider(inetAddress.getHostName(), inetAddress.getPort(), user, pass);
                }
            }
        }

        DetailLevel detailLevel = properties.getProperty(ApiClientConnectorProperty.DETAIL_LEVEL, DetailLevel.class, DetailLevel.MINIMAL);
        SLF4JInterceptor interceptor = new SLF4JInterceptor(detailLevel);

        HttpClientBuilder builder = HttpClients.custom()
                .setDefaultRequestConfig(requestBuilder.build())
                .addInterceptorFirst((HttpRequestInterceptor) interceptor)
                .addInterceptorLast((HttpResponseInterceptor) interceptor);
        if (credentialsProvider != null) {
            builder.setDefaultCredentialsProvider(credentialsProvider);
        }
        CloseableHttpClient client = builder.build();

        ExecutorService executorService = Executors.newCachedThreadPool(new ThreadFactoryBuilder().setNameFormat("purecloud-sdk-%d").build());

        return new ApacheHttpClientConnector(client, executorService);
    }
}
