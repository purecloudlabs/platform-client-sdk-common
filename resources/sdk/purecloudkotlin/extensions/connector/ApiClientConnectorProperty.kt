package com.mypurecloud.sdk.v2.connector

object ApiClientConnectorProperty {
    private val PREFIX = ApiClientConnectorProperty::class.java.name + "."
    val CONNECTION_TIMEOUT = PREFIX + "CONNECTION_TIMEOUT"
    val DETAIL_LEVEL = PREFIX + "DETAIL_LEVEL"
    val PROXY = PREFIX + "PROXY"
    val PROXY_USER = PREFIX + "PROXY_USER"
    val PROXY_PASS = PREFIX + "PROXY_PASS"
    val ASYNC_EXECUTOR_SERVICE = PREFIX + "ASYNC_EXECUTOR_SERVICE"
    @kotlin.jvm.JvmField
    val CONNECTOR_PROVIDER = PREFIX + "CONNECTOR_PROVIDER"
}
