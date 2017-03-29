# NotificationHandler Helper Class

The Java SDK includes a helper class, `NotificationHandler`, to assist in managing PureCloud notifications. The class will create a single notification channel, or use an existing one, and provides methods to add and remove subscriptions. It utilizes the listener pattern to invoke methods with a deserialized notification object whenever an event is received.

## Dependencies

This feature requires the `com.neovisionaries:nv-websocket-client` package to handle websocket communications. More information can be found at https://github.com/TakahikoKawasaki/nv-websocket-client.

## Using NotificationHandler

### Create a new instance

Option 1 (preferred): Use the builder

This code example uses the NotificationHandler's builder to create an instance of the class. This has the benefit of registering listeners and connecting to the websocket all in one chained command. The builder has the following methods:

* `withNotificationListener(NotificationListener<?> notificationListener)` adds a NotificationListener instance and registers the topic to the channel
* `withNotificationListeners(List<NotificationListener<?>> notificationListeners)` same as `withNotificationListener`, but can add multiple in one command
* `withWebSocketListener(WebSocketListener webSocketListener)` adds a WebSocketListener instance
* `withChannel(Channel channel)` specifies an existing Channel to use instead of creating a new one
* `withAutoConnect(Boolean connectAsync)` specifes how the websocket should be autoconnected. `true` will connect asynchronously. `false` will connect synchronously. `null` or not calling this method will require `NotificationListener.connect(boolean async)` to be invoked to open the connection.
* `build()` constructs the NotificationHandler instance

```
NotificationHandler notificationHandler = NotificationHandler.Builder.standard()
        .withWebSocketListener(new MyWebSocketListener())
        .withNotificationListener(new UserPresenceListener("9ed7d9f6-0c59-4360-ac54-40dd35eb9c2f"))
        .withNotificationListener(new ChannelMetadataListener())
        .withAutoConnect(false)
        .build();
```

Option 2: Use the constructor

```
NotificationHandler notificationHandler = new NotificationHandler();
```

### Opening the WebSocket

To open the websocket, use the `withAutoConnect(Boolean connectAsync)` builder method and provide a value or invoke `NotificationHandler.connect(bool async)` after it has been constructed.

### Closing the WebSocket

To explicitly close the websocket, use `NotificationHandler.disconnect()`. The web socket will be automatically closed upon finalization of `NotificationHandler`.

### Adding Topic Subscriptions

To add a new subscription to the channel, invoke `NotificationHandler.addSubscription(NotificationListener<T> listener)`. The listener should return the desired topic via the `getTopic()` method. When an event is recieved for the topic, the message will be deserialized to the `NotificationListener<T>` type returned by `getEventBodyClass()` and the `onEvent(NotificationEvent<T> event)` method will be invoked with the deserialized object.

### Removing Subscriptions

To remove a subscription, provide the topic name (case sensitive) to `NotificationHandler.RemoveSubscription(String topic)`. To remove all subscriptions, invoke `NotificationHandler.RemoveAllSubscriptions()`.

## Handling Event Notifications

To handle notifications, create a class that implements the `NotificationListener<T>` interface and provide it to `NotificationHandler` via `Builder.withNotificationListener(NotificationListener<?> notificationListener)` or `NotificationHandler.addSubscription(NotificationListener<T> listener)`.

* `String getTopic()` must return the topic that will be registered. This value is also used to determine which listener to invoke when an event arrives.
* `Class<?> getEventBodyClass()` must return the target class that will be used to deserialize the event's body. Find the correct classes to use in **TODO: link to topic/pojo definition file**
* `void onEvent(NotificationEvent<T> event)` will be invoked with the deserialized message

## Full example

**Main Application**

```
public static void main(String[] args) {
    try {
        Configuration.setDefaultApiClient(ApiClient.Builder.standard().withAccessToken("your access token").withBasePath("https://api.mypurecloud.com").build());

        // Construct NotificationHandler instance and synchronously connect
        NotificationHandler notificationHandler = NotificationHandler.Builder.standard()
                .withWebSocketListener(new MyWebSocketListener())
                .withNotificationListener(new UserPresenceListener("9ed7d9f6-0c59-4360-ac54-40dd35eb9c2f"))
                .withNotificationListener(new ChannelMetadataListener())
                .withAutoConnect(false)
                .build();

        // Send ping message (expect pong on channel.metadata topic)
        notificationHandler.sendPing();

        // Wait for the user to press enter before exiting
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        System.out.println("Press enter to exit...");
        String input = br.readLine();
        System.out.println("Done " + input);

        // Exit application successfully
        System.exit(0);
    } catch (Exception e) {
        e.printStackTrace();
        System.exit(1);
    }
}
```

**MyWebSocketListener.java**

```
public class MyWebSocketListener implements WebSocketListener {
    public void onStateChanged(WebSocketState state) {
        System.out.println("[onStateChanged] " + state);
    }

    public void onConnected() {
        System.out.println("[onConnected]");
    }

    public void onDisconnected(boolean closedByServer) {
        System.out.println("[onDisconnected] closedByServer=" + closedByServer);
    }

    public void onError(WebSocketException exception) {
        System.out.println("[onError] " + exception);
    }

    public void onConnectError(WebSocketException exception) {
        System.out.println("[onConnectError] " + exception);
    }

    public void onCallbackError(Throwable exception) {
        System.out.println("[handleCallbackError] " + exception);
    }

    public void onUnhandledEvent(String event) {
        System.out.println("[onUnhandledEvent] " + event);
    }
}
```

**ChannelMetadataListener.java**

```
public class ChannelMetadataListener implements NotificationListener<ChannelMetadataNotification> {
    public String getTopic() {
        return "channel.metadata";
    }

    public Class<?> getEventBodyClass() {
        return ChannelMetadataNotification.class;
    }

    public void onEvent(NotificationEvent<ChannelMetadataNotification> notificationEvent) {
        System.out.println("[channel.metadata] " + notificationEvent.getEventBody().getMessage());
    }
}
```

**UserPresenceListener.java**

```
public class UserPresenceListener implements NotificationListener<UserPresenceNotification> {
    private String topic;

    public String getTopic() {
        return topic;
    }

    public Class<UserPresenceNotification> getEventBodyClass() {
        return UserPresenceNotification.class;
    }

    public void onEvent(NotificationEvent<UserPresenceNotification> event) {
        System.out.println("system presence -> " + event.getEventBody().getPresenceDefinition().getSystemPresence());
    }

    public UserPresenceListener(String userId) {
        this.topic = "v2.users." + userId + ".presence";
    }
}
```
