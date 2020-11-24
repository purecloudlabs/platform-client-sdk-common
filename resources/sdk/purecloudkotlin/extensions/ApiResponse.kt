package com.mypurecloud.sdk.v2

import java.lang.Exception

interface ApiResponse<T> : AutoCloseable {
    val exception: Exception?
    val statusCode: Int
    fun hasRawBody(): Boolean
    val rawBody: String?
    val pBody: T
    fun getBody() : T?
    val headers: Map<String?, String?>
    fun getHeader(key: String?): String?
    fun getCorrelationId() : String?
    fun getStatusReasonPhrase() : String?
}
