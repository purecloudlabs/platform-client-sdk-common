package com.mypurecloud.sdk.v2.connector.ning

import com.google.common.base.Charsets
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorResponse
import io.netty.handler.codec.http.HttpHeaders
import org.asynchttpclient.Response
import java.io.IOException
import java.io.InputStream
import java.util.*

class AsyncHttpResponse(private val response: Response) : ApiClientConnectorResponse {
    override val statusCode: Int
        get() = response.statusCode
    override val statusReasonPhrase: String?
        get() = response.statusText

    override fun getHeaders(): Map<String, String> {
        val headers: HttpHeaders = response.headers
        val map: MutableMap<String, String> = mutableMapOf()
        for (name in headers.names()) {
            map[name] = headers.get(name)
        }
        return map
    }

    override fun hasBody(): Boolean {
        return response.hasResponseBody()
    }

    @Throws(IOException::class)
    override fun readBody(): String? {
        return String(response.responseBodyAsBytes, Charsets.UTF_8)
    }

    override fun getBody(): InputStream? {
        return response.responseBodyAsStream
    }

    @Throws(Exception::class)
    override fun close() {
    }
}
