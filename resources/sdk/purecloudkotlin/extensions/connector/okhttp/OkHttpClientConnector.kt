package com.mypurecloud.sdk.v2.connector.okhttp

import com.google.common.util.concurrent.SettableFuture
import com.mypurecloud.sdk.v2.AsyncApiCallback
import com.mypurecloud.sdk.v2.connector.ApiClientConnector
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorRequest
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorResponse
import com.squareup.okhttp.*
import java.io.IOException
import java.util.concurrent.Future

class OkHttpClientConnector(private val client: OkHttpClient) : ApiClientConnector {
    @Throws(IOException::class)
    override fun invoke(request: ApiClientConnectorRequest): ApiClientConnectorResponse {
        val call = client.newCall(buildRequest(request))
        return OkHttpResponse(call.execute())
    }

    override fun invokeAsync(request: ApiClientConnectorRequest, callback: AsyncApiCallback<ApiClientConnectorResponse?>): Future<ApiClientConnectorResponse> {
        val future = SettableFuture.create<ApiClientConnectorResponse>()
        try {
            val call = client.newCall(buildRequest(request))
            call.enqueue(object : Callback {
                override fun onFailure(request: Request, e: IOException) {
                    callback.onFailed(e)
                    future.setException(e)
                }

                @Throws(IOException::class)
                override fun onResponse(response: Response) {
                    val okHttpResponse = OkHttpResponse(response)
                    callback.onCompleted(okHttpResponse)
                    future.set(OkHttpResponse(response))
                }
            })
        } catch (exception: Throwable) {
            callback.onFailed(exception)
            future.setException(exception)
        }
        return future
    }

    @Throws(IOException::class)
    private fun buildRequest(request: ApiClientConnectorRequest): Request {
        var builder = Request.Builder()
                .url(request.url)
        val headers = request.headers
        if (headers.isNotEmpty()) {
            for ((key, value) in headers) {
                builder = builder.addHeader(key, value)
            }
        }
        val method = request.method
        builder = when (method) {
            "GET" -> {
                builder.get()
            }
            "HEAD" -> {
                builder.head()
            }
            "POST" -> {
                builder.post(createBody(request))
            }
            "PUT" -> {
                builder.put(createBody(request))
            }
            "DELETE" -> {
                builder.delete()
            }
            "PATCH" -> {
                builder.patch(createBody(request))
            }
            else -> {
                throw IllegalStateException("Unknown method type $method")
            }
        }
        return builder.build()
    }

    @Throws(IOException::class)
    private fun createBody(request: ApiClientConnectorRequest): RequestBody {
        var contentType = "application/json"
        val headers = request.headers
        if (headers.isNotEmpty()) {
            for (name in headers.keys) {
                if (name.equals("content-type", ignoreCase = true)) {
                    contentType = headers[name] ?: ""
                    break
                }
            }
        }
        return if (request.hasBody()) {
            RequestBody.create(MediaType.parse(contentType), request.readBody())
        } else RequestBody.create(null, ByteArray(0))
    }

    @Throws(Exception::class)
    override fun close() {
    }
}
