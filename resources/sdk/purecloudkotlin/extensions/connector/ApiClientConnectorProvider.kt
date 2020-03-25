package com.mypurecloud.sdk.v2.connector

interface ApiClientConnectorProvider {
    fun create(properties: ApiClientConnectorProperties): ApiClientConnector
}
