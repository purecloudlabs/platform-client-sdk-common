package com.mypurecloud.sdk.v2.connector.okhttp;

import com.mypurecloud.sdk.v2.connector.ApiClientConnector;
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorProperties;
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorProperty;
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorProvider;
import okhttp3.Dispatcher;
import okhttp3.OkHttpClient;

import java.io.FileInputStream;
import java.net.Proxy;
import java.security.KeyStore;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;

import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509TrustManager;



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

        Proxy proxy =properties.getProperty(ApiClientConnectorProperty.PROXY, Proxy.class, null);
        if (proxy != null) {
            builder.proxy(proxy);
        }

        ExecutorService executorService = properties.getProperty(ApiClientConnectorProperty.ASYNC_EXECUTOR_SERVICE, ExecutorService.class, null);
        if (executorService != null) {
            builder.dispatcher(new Dispatcher(executorService));
        }
        String keyStorePath = properties.getProperty(ApiClientConnectorProperty.KEYSTORE_PATH, String.class, null);
        String keyStorePassword = properties.getProperty(ApiClientConnectorProperty.KEYSTORE_PASSWORD, String.class, null);
        String trustStorePath = properties.getProperty(ApiClientConnectorProperty.TRUSTSTORE_PATH, String.class, null);
        String trustStorePassword = properties.getProperty(ApiClientConnectorProperty.TRUSTSTORE_PASSWORD, String.class, null);
        
        try{
            if (keyStorePath != null && keyStorePassword != null) {
                        
            KeyManagerFactory keyManagerFactory = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
            KeyStore keyStore = KeyStore.getInstance("PKCS12");
            try (FileInputStream keyStoreFileInputStream = new FileInputStream(keyStorePath)) {
                keyStore.load(keyStoreFileInputStream, keyStorePassword.toCharArray());
                keyManagerFactory.init(keyStore, keyStorePassword.toCharArray());
            }
          
            TrustManagerFactory trustManagerFactory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            KeyStore trustStore = KeyStore.getInstance("PKCS12");
            try (FileInputStream trustStoreFileInputStream = new FileInputStream(trustStorePath)) {
                trustStore.load(trustStoreFileInputStream, trustStorePassword.toCharArray());
                trustManagerFactory.init(trustStore);
            }
            SSLContext sslContext = SSLContext.getInstance("TLSv3");
            sslContext.init(keyManagerFactory.getKeyManagers(), trustManagerFactory.getTrustManagers(), null);

            builder.sslSocketFactory(sslContext.getSocketFactory(), (X509TrustManager)trustManagerFactory.getTrustManagers()[0]);
            }
    
        }
            catch (Exception e) {
            throw new RuntimeException(e);

        }
         
        return new OkHttpClientConnector(builder.build());
    }
}
