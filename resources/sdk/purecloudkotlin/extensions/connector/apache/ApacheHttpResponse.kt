package com.mypurecloud.sdk.v2.connector.apache

import com.mypurecloud.sdk.v2.connector.ApiClientConnectorResponse
import org.apache.http.client.methods.CloseableHttpResponse
import org.apache.http.entity.BufferedHttpEntity
import org.apache.http.util.EntityUtils
import org.slf4j.LoggerFactory
import java.io.IOException
import java.io.InputStream
import java.nio.charset.StandardCharsets
import java.util.*


internal class ApacheHttpResponse(private val response: CloseableHttpResponse) : ApiClientConnectorResponse {
    override val statusCode: Int
        get() = response.statusLine.statusCode
    override val statusReasonPhrase: String?
        get() = response.statusLine.reasonPhrase

    override fun getHeaders(): Map<String, String> {
        val map: MutableMap<String, String> = mutableMapOf()
        for (header in response.allHeaders) {
            map[header.name] = header.value
        }
        return map
    }

    override fun hasBody(): Boolean {
        val entity = response.entity
        return entity != null && entity.contentLength != 0L
    }

    @Throws(IOException::class)
    override fun readBody(): String? {
        val entity = response.entity
        return if (entity != null) EntityUtils.toString(entity, StandardCharsets.UTF_8) else null
    }

    override fun getBody(): InputStream? {
        val entity = response.entity
        return entity?.content
    }

    @Throws(Exception::class)
    override fun close() {
        response.close()
    }

    companion object {
        private val LOG = LoggerFactory.getLogger(ApacheHttpResponse::class.java)
    }

    init {
        val entity = response.entity
        if (entity != null) {
            if (!entity.isRepeatable) {
                try {
                    response.entity = BufferedHttpEntity(entity)
                } catch (exception: Exception) {
                    LOG.error("Failed to buffer HTTP entity.", exception)
                }
            }
        }
    }
}
