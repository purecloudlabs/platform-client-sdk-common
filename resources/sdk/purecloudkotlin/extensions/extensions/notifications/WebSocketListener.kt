package com.mypurecloud.sdk.v2.extensions.notifications

import com.neovisionaries.ws.client.WebSocketException
import com.neovisionaries.ws.client.WebSocketState

interface WebSocketListener {
    fun onStateChanged(state: WebSocketState?)
    fun onConnected()
    fun onDisconnected(closedByServer: Boolean)
    fun onError(exception: WebSocketException?)
    fun onConnectError(exception: WebSocketException?)
    fun onCallbackError(exception: Throwable?)
    fun onUnhandledEvent(event: String?)
}
