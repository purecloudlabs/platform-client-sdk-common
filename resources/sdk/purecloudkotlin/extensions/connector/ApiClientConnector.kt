package com.mypurecloud.sdk.v2.connector

import com.mypurecloud.sdk.v2.AsyncApiCallback
import java.io.IOException
import java.util.concurrent.Future

interface ApiClientConnector : AutoCloseable {
    @Throws(IOException::class)
    operator fun invoke(request: ApiClientConnectorRequest): ApiClientConnectorResponse

    fun invokeAsync(request: ApiClientConnectorRequest, callback: AsyncApiCallback<ApiClientConnectorResponse?>): Future<ApiClientConnectorResponse>
}
