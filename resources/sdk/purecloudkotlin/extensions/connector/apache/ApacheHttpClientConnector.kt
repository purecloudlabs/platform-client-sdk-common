package com.mypurecloud.sdk.v2.connector.apache

import com.google.common.util.concurrent.SettableFuture
import com.mypurecloud.sdk.v2.AsyncApiCallback
import com.mypurecloud.sdk.v2.connector.ApiClientConnector
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorRequest
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorResponse
import org.apache.http.client.methods.*
import org.apache.http.entity.StringEntity
import org.apache.http.impl.client.CloseableHttpClient
import java.io.IOException
import java.util.concurrent.ExecutorService
import java.util.concurrent.Future

class ApacheHttpClientConnector(private val client: CloseableHttpClient, private val executorService: ExecutorService?) : ApiClientConnector {
    @Throws(IOException::class)
    override fun invoke(request: ApiClientConnectorRequest): ApiClientConnectorResponse { // Build request object
        val httpUriRequest: HttpUriRequest
        val method = request.method
        val url = request.url
        val body = request.readBody()
        when (method) {
            "GET" -> {
                val req = HttpGet(url)
                httpUriRequest = req
            }
            "HEAD" -> {
                val req = HttpHead(url)
                httpUriRequest = req
            }
            "POST" -> {
                val req = HttpPost(url)
                if (body != null) {
                    req.entity = StringEntity(body, "UTF-8")
                }
                httpUriRequest = req
            }
            "PUT" -> {
                val req = HttpPut(url)
                if (body != null) {
                    req.entity = StringEntity(body, "UTF-8")
                }
                httpUriRequest = req
            }
            "DELETE" -> {
                val req = HttpDelete(url)
                httpUriRequest = req
            }
            "PATCH" -> {
                val req = HttpPatch(url)
                if (body != null) {
                    req.entity = StringEntity(body, "UTF-8")
                }
                httpUriRequest = req
            }
            else -> {
                throw IllegalStateException("Unknown method type $method")
            }
        }
        for ((key, value) in request.headers) {
            httpUriRequest.setHeader(key, value)
        }
        val response = client.execute(httpUriRequest)
        return ApacheHttpResponse(response)
    }

    override fun invokeAsync(request: ApiClientConnectorRequest, callback: AsyncApiCallback<ApiClientConnectorResponse?>): Future<ApiClientConnectorResponse> {
        val future = SettableFuture.create<ApiClientConnectorResponse>()
        val task = Runnable {
            try {
                val response = invoke(request)
                callback.onCompleted(response)
                future.set(response)
            } catch (exception: Throwable) {
                callback.onFailed(exception)
                future.setException(exception)
            }
        }
        try {
            if (executorService != null) {
                executorService.submit(task)
            } else {
                task.run()
            }
        } catch (exception: Throwable) {
            callback.onFailed(exception)
            future.setException(exception)
        }
        return future
    }

    @Throws(IOException::class)
    override fun close() {
        client.close()
    }
}
