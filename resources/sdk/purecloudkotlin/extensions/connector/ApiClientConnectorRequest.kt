package com.mypurecloud.sdk.v2.connector

import java.io.IOException
import java.io.InputStream

interface ApiClientConnectorRequest {
    var method: String?
    var url: String
    var headers: MutableMap<String?, String?>
    fun hasBody(): Boolean
    @Throws(IOException::class)
    fun readBody(): String?
    var body: InputStream?
}
