package com.mypurecloud.sdk.v2.connector

import java.io.IOException
import java.io.InputStream

interface ApiClientConnectorResponse : AutoCloseable {
    val statusCode: Int
    val statusReasonPhrase: String?
    fun getHeaders(): Map<String, String>
    fun hasBody(): Boolean
    @Throws(IOException::class)
    fun readBody(): String?
    @Throws(IOException::class)
    fun getBody() : InputStream?
}
