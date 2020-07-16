package com.mypurecloud.sdk.v2.connector.okhttp

import com.mypurecloud.sdk.v2.connector.ApiClientConnectorResponse
import com.squareup.okhttp.Headers
import com.squareup.okhttp.Response
import java.io.IOException
import java.io.InputStream
import java.util.*

class OkHttpResponse(private val response: Response) : ApiClientConnectorResponse {
    private var responseBody: String? = null
    private var hasReadBody = false
    override val statusCode: Int
        get() = response.code()
    override val statusReasonPhrase: String?
        get() = response.message()

    override fun getHeaders(): Map<String, String> {
        val map: MutableMap<String, String> = mutableMapOf()
        val headers: Headers? = response.headers()
        if (headers != null) {
            for (name in headers.names()) {
                map[name!!] = headers.get(name)
            }
        }
        return map
    }

    override fun hasBody(): Boolean {
        return try {
            val bodyString = readBody()
            bodyString != null && bodyString.isNotEmpty()
        } catch (e: IOException) {
            false
        }
    }

    @Throws(IOException::class)
    override fun readBody(): String? {
        if (hasReadBody) return responseBody
        hasReadBody = true
        val body = response.body()
        responseBody = body?.string()
        return responseBody
    }

    override fun getBody(): InputStream? {
        val body = response.body()
        return body?.byteStream()
    }

    @Throws(Exception::class)
    override fun close() {
    }
}
