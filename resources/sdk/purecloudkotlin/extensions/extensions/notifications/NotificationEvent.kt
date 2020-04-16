package com.mypurecloud.sdk.v2.extensions.notifications

class NotificationEvent<T> {
    private val topicName: String? = null
    private val version: String? = null
    private var eventBodyRaw: String? = null
    private val eventBody: T? = null
    private val metadata: Metadata? = null
    fun getTopicName(): String? {
        return topicName
    }

    fun getVersion(): String? {
        return version
    }

    fun getEventBodyRaw(): String? {
        return eventBodyRaw
    }

    fun setEventBodyRaw(eventBodyRaw: String?) {
        this.eventBodyRaw = eventBodyRaw
    }

    fun getEventBody(): T? {
        return eventBody
    }

    fun getMetadata(): Metadata? {
        return metadata
    }
}
