package com.mypurecloud.sdk.v2

import com.mypurecloud.sdk.v2.extensions.notifications.NotificationEvent
import com.mypurecloud.sdk.v2.extensions.notifications.NotificationListener
import com.mypurecloud.sdk.v2.model.PresenceEventUserPresence

class UserPresenceListener(userId: String) : NotificationListener<PresenceEventUserPresence?> {
    private val topic: String = "v2.users.$userId.presence"
    private var systemPresence = ""
    var presenceId = ""
        private set

    override fun getTopic(): String {
        return topic
    }

    override fun getEventBodyClass(): Class<PresenceEventUserPresence> {
        return PresenceEventUserPresence::class.java
    }

    override fun onEvent(event: NotificationEvent<*>?) {
        val notification = event?.getEventBody() as PresenceEventUserPresence
        systemPresence = notification.presenceDefinition?.systemPresence.toString()
        presenceId = notification.presenceDefinition?.id.toString()
        println("system presence -> " + ((event.getEventBody() as PresenceEventUserPresence).presenceDefinition?.systemPresence
                ?: "INVALID"))
    }
}
