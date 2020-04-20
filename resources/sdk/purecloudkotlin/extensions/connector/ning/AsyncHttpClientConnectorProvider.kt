package com.mypurecloud.sdk.v2.connector.ning

import com.mypurecloud.sdk.v2.connector.ApiClientConnector
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorProperties
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorProperty
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorProvider
import org.asynchttpclient.AsyncHttpClient
import org.asynchttpclient.AsyncHttpClientConfig
import org.asynchttpclient.DefaultAsyncHttpClient
import org.asynchttpclient.DefaultAsyncHttpClientConfig
import org.asynchttpclient.util.ProxyUtils
import java.io.IOException
import java.net.Proxy
import java.net.ProxySelector
import java.net.SocketAddress
import java.net.URI

class AsyncHttpClientConnectorProvider : ApiClientConnectorProvider {
    override fun create(properties: ApiClientConnectorProperties): ApiClientConnector {
        val builder = DefaultAsyncHttpClientConfig.Builder()
        val connectionTimeout = properties.getProperty(ApiClientConnectorProperty.CONNECTION_TIMEOUT, Int::class.java, null)
        if (connectionTimeout != null && connectionTimeout > 0) {
            builder.setConnectTimeout(connectionTimeout)
            builder.setReadTimeout(connectionTimeout)
            builder.setRequestTimeout(connectionTimeout)
        }
        val proxy = properties.getProperty(ApiClientConnectorProperty.PROXY, Proxy::class.java, null)
        if (proxy != null) {
            val proxySelector: ProxySelector = object : ProxySelector() {
                override fun select(uri: URI): List<Proxy> {
                    return listOf(proxy)
                }

                override fun connectFailed(uri: URI, sa: SocketAddress, ioe: IOException) {}
            }
            val proxyServerSelector = ProxyUtils.createProxyServerSelector(proxySelector)
            builder.setProxyServerSelector(proxyServerSelector)
            builder.setUseProxySelector(true)
        }
        val config: AsyncHttpClientConfig = builder.build()
        val client: AsyncHttpClient = DefaultAsyncHttpClient(config)
        return AsyncHttpClientConnector(client)
    }
}
