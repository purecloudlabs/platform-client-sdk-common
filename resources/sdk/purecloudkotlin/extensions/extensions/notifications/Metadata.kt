package com.mypurecloud.sdk.v2.extensions.notifications

import com.fasterxml.jackson.annotation.JsonProperty

class Metadata {
    @JsonProperty("CorrelationId")
    private val correlationId: String? = null

    fun getCorrelationId(): String? {
        return correlationId
    }
}
