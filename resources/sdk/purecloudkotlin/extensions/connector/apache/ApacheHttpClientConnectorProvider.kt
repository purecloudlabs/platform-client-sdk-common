package com.mypurecloud.sdk.v2.connector.apache

import com.google.common.util.concurrent.ThreadFactoryBuilder
import com.mypurecloud.sdk.v2.DetailLevel
import com.mypurecloud.sdk.v2.connector.ApiClientConnector
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorProperties
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorProperty
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorProvider
import org.apache.http.HttpHost
import org.apache.http.HttpRequestInterceptor
import org.apache.http.HttpResponseInterceptor
import org.apache.http.client.config.RequestConfig
import org.apache.http.impl.client.HttpClients
import java.net.InetSocketAddress
import java.net.Proxy
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class ApacheHttpClientConnectorProvider : ApiClientConnectorProvider {
    override fun create(properties: ApiClientConnectorProperties): ApiClientConnector {
        var requestBuilder = RequestConfig.custom()
        val connectionTimeout = properties.getProperty(ApiClientConnectorProperty.CONNECTION_TIMEOUT, Int::class.java, null)
        if (connectionTimeout != null && connectionTimeout > 0) {
            requestBuilder = requestBuilder.setConnectTimeout(connectionTimeout)
                    .setSocketTimeout(connectionTimeout)
                    .setConnectionRequestTimeout(connectionTimeout)
        }
        val proxy = properties.getProperty(ApiClientConnectorProperty.PROXY, Proxy::class.java, null)
        var credentialsProvider: ApacheHttpCredentialsProvider? = null
        if (proxy != null) {
            val address = proxy.address()
            if (address is InetSocketAddress) {
                val inetAddress = address
                val proxyHost = HttpHost(inetAddress.address, inetAddress.port)
                requestBuilder.setProxy(proxyHost)
                val user = properties.getProperty(ApiClientConnectorProperty.PROXY_USER, String::class.java, null)
                val pass = properties.getProperty(ApiClientConnectorProperty.PROXY_PASS, String::class.java, null)
                if (user != null && pass != null) {
                    credentialsProvider = ApacheHttpCredentialsProvider(inetAddress.hostName, inetAddress.port, user, pass)
                }
            }
        }
        val detailLevel = properties.getProperty(ApiClientConnectorProperty.DETAIL_LEVEL, DetailLevel::class.java, DetailLevel.MINIMAL)
        val interceptor = SLF4JInterceptor(detailLevel)
        val builder = HttpClients.custom()
                .setDefaultRequestConfig(requestBuilder.build())
                .addInterceptorFirst(interceptor as HttpRequestInterceptor)
                .addInterceptorLast(interceptor as HttpResponseInterceptor)
        if (credentialsProvider != null) {
            builder.setDefaultCredentialsProvider(credentialsProvider)
        }
        val client = builder.build()
        var executorService = properties.getProperty(ApiClientConnectorProperty.ASYNC_EXECUTOR_SERVICE, ExecutorService::class.java, null)
        if (executorService == null) {
            executorService = Executors.newCachedThreadPool(ThreadFactoryBuilder().setNameFormat("purecloud-sdk-%d").build())
        }
        return ApacheHttpClientConnector(client, executorService)
    }
}
