package com.mypurecloud.sdk.v2.extensions.notifications

interface NotificationListener<T> {
    fun getTopic(): String?
    fun getEventBodyClass(): Class<*>?
    fun onEvent(event: NotificationEvent<*>?)
}
