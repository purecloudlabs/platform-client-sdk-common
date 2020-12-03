package cloud.genesys.webmessaging.sdk;

public interface AsyncApiCallback<T> {
    void onCompleted(T response);
    void onFailed(Throwable exception);
}
