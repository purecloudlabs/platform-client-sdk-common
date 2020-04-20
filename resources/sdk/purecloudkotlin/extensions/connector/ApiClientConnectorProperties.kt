package com.mypurecloud.sdk.v2.connector

interface ApiClientConnectorProperties {
    fun <T> getProperty(key: String?, propertyClass: Class<T>, defaultValue: T?): T?
}
