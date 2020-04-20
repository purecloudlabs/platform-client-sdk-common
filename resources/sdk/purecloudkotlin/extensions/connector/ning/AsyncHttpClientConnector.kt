package com.mypurecloud.sdk.v2.connector.ning

import com.google.common.util.concurrent.Futures
import com.mypurecloud.sdk.v2.AsyncApiCallback
import com.mypurecloud.sdk.v2.connector.ApiClientConnector
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorRequest
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorResponse
import org.asynchttpclient.AsyncCompletionHandler
import org.asynchttpclient.AsyncHttpClient
import org.asynchttpclient.RequestBuilder
import org.asynchttpclient.Response
import org.asynchttpclient.uri.Uri
import java.io.IOException
import java.io.InterruptedIOException
import java.util.concurrent.ExecutionException
import java.util.concurrent.Future

class AsyncHttpClientConnector(private val client: AsyncHttpClient) : ApiClientConnector {
    @Throws(IOException::class)
    override fun invoke(request: ApiClientConnectorRequest): ApiClientConnectorResponse {
        return try {
            val future = invokeAsync(request, object : AsyncApiCallback<ApiClientConnectorResponse?> {
                override fun onCompleted(response: ApiClientConnectorResponse?) {}
                override fun onFailed(exception: Throwable) {}
            })
            future.get()
        } catch (exception: InterruptedException) {
            throw InterruptedIOException(exception.message)
        } catch (exception: ExecutionException) {
            val cause = exception.cause
            if (cause is IOException) {
                throw (cause as IOException?)!!
            }
            throw IOException(cause)
        }
    }

    override fun invokeAsync(request: ApiClientConnectorRequest, callback: AsyncApiCallback<ApiClientConnectorResponse?>): Future<ApiClientConnectorResponse> {
        return try {
            val method = request.method
            var builder = RequestBuilder()
                    .setUri(Uri.create(request.url))
                    .setMethod(method)
            when (method) {
                "GET", "HEAD", "DELETE" -> {
                }
                "POST", "PUT", "PATCH" -> if (request.hasBody()) {
                    builder = builder.setBody(request.readBody())
                }
                else -> return Futures.immediateFailedFuture(IllegalStateException("Unknown method type $method"))
            }
            for ((key, value) in request.headers) {
                builder = builder.addHeader(key, value)
            }
            client.executeRequest(builder, object : AsyncCompletionHandler<ApiClientConnectorResponse>() {
                @Throws(Exception::class)
                override fun onCompleted(response: Response): ApiClientConnectorResponse {
                    return AsyncHttpResponse(response)
                }
            })
        } catch (exception: Throwable) {
            callback.onFailed(exception)
            Futures.immediateFailedFuture(exception)
        }
    }

    @Throws(Exception::class)
    override fun close() {
    }
}
