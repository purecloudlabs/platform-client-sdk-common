package com.mypurecloud.sdk.v2

interface ApiRequest<T> {
    val path: String
    val method: String
    val pathParams: Map<String, String>
    val queryParams: List<Pair>
    val formParams: Map<String, Any>
    val headerParams: Map<String, String>
    val customHeaders: Map<String, String>
    val contentType: String?
    val accepts: String?
    val body: T
    val authNames: Array<String?>
}
