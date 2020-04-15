package com.mypurecloud.sdk.v2.extensions.notifications

import com.fasterxml.jackson.databind.ObjectMapper
import com.mypurecloud.sdk.v2.ApiClient
import com.mypurecloud.sdk.v2.ApiException
import com.mypurecloud.sdk.v2.Configuration.defaultApiClient
import com.mypurecloud.sdk.v2.api.NotificationsApi
import com.mypurecloud.sdk.v2.api.request.PostNotificationsChannelsRequest
import com.mypurecloud.sdk.v2.model.Channel
import com.mypurecloud.sdk.v2.model.ChannelTopic
import com.mypurecloud.sdk.v2.model.SystemMessageSystemMessage
import com.neovisionaries.ws.client.*
import org.slf4j.LoggerFactory
import java.io.IOException
import java.util.*

class NotificationHandler private constructor(builder: Builder) : Any() {
    private var notificationsApi: NotificationsApi? = NotificationsApi()
    private var webSocket: WebSocket?
    var channel: Channel? = null
    private val typeMap: MutableMap<String?, NotificationListener<*>> = HashMap()
    private var webSocketListener: WebSocketListener? = null
    private var objectMapper: ObjectMapper? = null

    constructor() : this(Builder.standard()) {}

    class Builder {
        var notificationListeners: MutableList<NotificationListener<*>>? = null
        var webSocketListener: WebSocketListener? = null
        var channel: Channel? = null
        var connectAsync: Boolean? = null
        var apiClient: ApiClient? = null
        var notificationsApi: NotificationsApi? = null
        var objectMapper: ObjectMapper? = null
        var proxyHost: String? = null
        fun withNotificationListener(notificationListener: NotificationListener<*>): Builder {
            notificationListeners!!.add(notificationListener)
            return this
        }

        fun withNotificationListeners(notificationListeners: List<NotificationListener<*>>): Builder {
            this.notificationListeners!!.addAll(notificationListeners)
            return this
        }

        fun withWebSocketListener(webSocketListener: WebSocketListener?): Builder {
            this.webSocketListener = webSocketListener
            return this
        }

        fun withChannel(channel: Channel?): Builder {
            this.channel = channel
            return this
        }

        fun withAutoConnect(connectAsync: Boolean?): Builder {
            this.connectAsync = connectAsync
            return this
        }

        fun withApiClient(apiClient: ApiClient?): Builder {
            this.apiClient = apiClient
            return this
        }

        fun withNotificationsApi(notificationsApi: NotificationsApi?): Builder {
            this.notificationsApi = notificationsApi
            return this
        }

        fun withObjectMapper(objectMapper: ObjectMapper?): Builder {
            this.objectMapper = objectMapper
            return this
        }

        fun withProxyHost(proxyHost: String?): Builder {
            this.proxyHost = proxyHost
            return this
        }

        @Throws(IOException::class, ApiException::class, WebSocketException::class)
        fun build(): NotificationHandler {
            return NotificationHandler(this)
        }

        companion object {
            fun standard(): Builder {
                val builder = Builder()
                builder.notificationListeners = ArrayList()
                builder.webSocketListener = null
                builder.channel = null
                builder.connectAsync = null
                builder.apiClient = null
                builder.notificationsApi = null
                builder.objectMapper = null
                builder.proxyHost = null
                return builder
            }
        }
    }

    fun sendPing() {
        webSocket!!.sendText("{\"message\":\"ping\"}")
    }

    fun setWebSocketListener(webSocketListener: WebSocketListener?) {
        this.webSocketListener = webSocketListener
    }

    @Throws(IOException::class, ApiException::class)
    fun <T> addSubscription(listener: NotificationListener<T>) {
        addSubscriptions(listOf<NotificationListener<*>>(listener))
    }

    @Throws(IOException::class, ApiException::class)
    fun addSubscriptions(listeners: List<NotificationListener<*>>?) {
        val topics: MutableList<ChannelTopic> = LinkedList()
        for (listener in listeners!!) {
            typeMap[listener.getTopic()] = listener
            if ("channel.metadata" != listener.getTopic() && !listener.getTopic()?.startsWith("v2.system")!!) {
                val channelTopic = ChannelTopic()
                channelTopic.id = listener.getTopic()
                topics.add(channelTopic)
            }
        }
        notificationsApi!!.postNotificationsChannelSubscriptions(channel!!.id!!, topics)
    }

    fun <T> addHandlerNoSubscribe(listener: NotificationListener<T>) {
        addHandlersNoSubscribe(listOf<NotificationListener<*>>(listener))
    }

    fun addHandlersNoSubscribe(listeners: List<NotificationListener<*>>?) {
        for (listener in listeners!!) {
            typeMap[listener.getTopic()] = listener
        }
    }

    @Throws(IOException::class, ApiException::class)
    fun RemoveSubscription(topic: String?) {
        val channels = notificationsApi!!.getNotificationsChannelSubscriptions(channel!!.id!!)
        var match: ChannelTopic? = null
        for (channelTopic in channels!!.entities!!) {
            if (channelTopic.id.equals(topic, ignoreCase = true)) {
                match = channelTopic
                break
            }
        }
        if (match == null) return
        channels.entities!!.remove(match)
        notificationsApi!!.putNotificationsChannelSubscriptions(channel!!.id!!, channels.entities!!)
        typeMap.remove(topic)
    }

    @Throws(IOException::class, ApiException::class)
    fun RemoveAllSubscriptions() {
        notificationsApi!!.deleteNotificationsChannelSubscriptions(channel!!.id!!)
        typeMap.clear()
    }

    @Throws(WebSocketException::class)
    fun connect(async: Boolean) {
        if (async) webSocket!!.connectAsynchronously() else webSocket!!.connect()
    }

    fun disconnect() {
        if (webSocket != null && webSocket?.isOpen!!) webSocket?.disconnect()
    }

    @Throws(Throwable::class)
    protected fun finalize() {
        try { // Ensure socket is closed on GC
            disconnect()
        } catch (ex: Exception) {
            LOGGER.error(ex.message, ex)
        }
    }

    companion object {
        private val LOGGER = LoggerFactory.getLogger(NotificationHandler::class.java)
    }

    init { 
        // Construct notifications API
        notificationsApi = when {
            builder.notificationsApi != null -> {
                builder.notificationsApi
            }
            builder.apiClient != null -> {
                NotificationsApi(builder.apiClient)
            }
            else -> {
                NotificationsApi()
            }
        }

        // Set object mapper
        objectMapper = when {
            builder.objectMapper != null -> {
                builder.objectMapper
            }
            builder.apiClient != null -> {
                builder.apiClient!!.objectMapper
            }
            else -> {
                defaultApiClient!!.objectMapper
            }
        }

        // Set channel
        channel = when (builder.channel) {
            null -> {
                notificationsApi!!.postNotificationsChannels(PostNotificationsChannelsRequest.builder().build())
            }
            else -> {
                builder.channel
            }
        }

        // Set notification listeners
        addSubscriptions(builder.notificationListeners)

        // Add handler for socket closing event
        addHandlerNoSubscribe(SocketClosingHandler())

        // Set web socket listener
        setWebSocketListener(builder.webSocketListener)

        // Initialize web socket
        val factory = WebSocketFactory()

        if (builder.proxyHost != null) factory.proxySettings.setServer(builder.proxyHost)
        webSocket = factory
                .createSocket(channel!!.connectUri)
                .addListener(object : WebSocketAdapter() {
                    @Throws(Exception::class)
                    override fun onStateChanged(websocket: WebSocket, newState: WebSocketState) {
                        if (webSocketListener != null) webSocketListener!!.onStateChanged(newState)
                    }

                    @Throws(Exception::class)
                    override fun onConnected(websocket: WebSocket, headers: Map<String, List<String>>) {
                        if (webSocketListener != null) webSocketListener!!.onConnected()
                    }

                    @Throws(Exception::class)
                    override fun onConnectError(websocket: WebSocket, exception: WebSocketException) {
                        if (webSocketListener != null) webSocketListener!!.onConnectError(exception)
                    }

                    @Throws(Exception::class)
                    override fun onDisconnected(websocket: WebSocket, serverCloseFrame: WebSocketFrame, clientCloseFrame: WebSocketFrame, closedByServer: Boolean) {
                        if (webSocketListener != null) webSocketListener!!.onDisconnected(closedByServer)
                    }

                    override fun onTextMessage(websocket: WebSocket, message: String) {
                        try {
                            if (LOGGER.isDebugEnabled) {
                                LOGGER.debug("---WEBSOCKET MESSAGE---\n$message")
                            }
                            // Deserialize without knowing body type to figure out topic name
                            val genericEventType = objectMapper!!.typeFactory.constructParametricType(NotificationEvent::class.java, Any::class.java)
                            val genericEventData = objectMapper!!.readValue<NotificationEvent<Any>>(message, genericEventType)
                            // Look up Listener based on topic name
                            val specificType = typeMap[genericEventData.getTopicName()]
                            if (specificType != null) { // Deserialize to specific type provided by listener
                                val specificEventType = objectMapper!!.typeFactory.constructParametricType(NotificationEvent::class.java, specificType.getEventBodyClass())
                                val notificationEvent = objectMapper!!.readValue<Any>(message, specificEventType) as NotificationEvent<*>
                                // Set raw body
                                notificationEvent.setEventBodyRaw(message)
                                // Raise event
                                specificType.onEvent(notificationEvent)
                            } else { // Unhandled topic
                                if (webSocketListener != null) webSocketListener!!.onUnhandledEvent(message)
                            }
                        } catch (ex: Exception) {
                            LOGGER.error(ex.message, ex)
                        }
                    }

                    @Throws(Exception::class)
                    override fun onError(websocket: WebSocket, cause: WebSocketException) {
                        if (webSocketListener != null) webSocketListener!!.onError(cause)
                    }

                    @Throws(Exception::class)
                    override fun handleCallbackError(websocket: WebSocket, cause: Throwable) {
                        if (webSocketListener != null) webSocketListener!!.onCallbackError(cause)
                    }
                })
        if (builder.connectAsync != null) connect(builder.connectAsync!!)
    }

    inner class SocketClosingHandler : NotificationListener<SystemMessageSystemMessage?> {
        private val topic: String = "v2.system.socket_closing"

        override fun getTopic(): String? {
            return topic
        }

        override fun getEventBodyClass(): Class<SystemMessageSystemMessage>? {
            return SystemMessageSystemMessage::class.java
        }

        override fun onEvent(event: NotificationEvent<*>?) {
            try {
                webSocket = webSocket!!.recreate()
            } catch (ex: Exception) {
                LOGGER.error(ex.message, ex)
            }
        }
    }
}
