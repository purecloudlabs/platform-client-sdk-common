package com.mypurecloud.sdk.v2.extensions.notifications

import com.fasterxml.jackson.annotation.JsonProperty

class ChannelMetadataNotification {
    private val message: String? = null
    @JsonProperty("message")
    fun getMessage(): String? {
        return message
    }
}
