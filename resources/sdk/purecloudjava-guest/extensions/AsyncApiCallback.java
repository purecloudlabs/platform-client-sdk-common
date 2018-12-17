package com.mypurecloud.sdk.v2.guest;

public interface AsyncApiCallback<T> {
    void onCompleted(T response);
    void onFailed(Throwable exception);
}
