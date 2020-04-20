package com.mypurecloud.sdk.v2.connector.okhttp

import com.mypurecloud.sdk.v2.connector.ApiClientConnector
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorProperties
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorProperty
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorProvider
import com.squareup.okhttp.Dispatcher
import com.squareup.okhttp.OkHttpClient
import java.net.Proxy
import java.util.concurrent.ExecutorService
import java.util.concurrent.TimeUnit

class OkHttpClientConnectorProvider : ApiClientConnectorProvider {
    override fun create(properties: ApiClientConnectorProperties): ApiClientConnector {
        val client = OkHttpClient()
        val connectionTimeout = properties.getProperty(ApiClientConnectorProperty.CONNECTION_TIMEOUT, Int::class.java, null)
        if (connectionTimeout != null && connectionTimeout > 0) {
            client.setConnectTimeout(connectionTimeout.toLong(), TimeUnit.MILLISECONDS)
            client.setReadTimeout(connectionTimeout.toLong(), TimeUnit.MILLISECONDS)
            client.setWriteTimeout(connectionTimeout.toLong(), TimeUnit.MILLISECONDS)
        }
        val proxy = properties.getProperty(ApiClientConnectorProperty.PROXY, Proxy::class.java, null)
        if (proxy != null) {
            client.proxy = proxy
        }
        val executorService = properties.getProperty(ApiClientConnectorProperty.ASYNC_EXECUTOR_SERVICE, ExecutorService::class.java, null)
        if (executorService != null) {
            client.dispatcher = Dispatcher(executorService)
        }
        return OkHttpClientConnector(client)
    }
}
