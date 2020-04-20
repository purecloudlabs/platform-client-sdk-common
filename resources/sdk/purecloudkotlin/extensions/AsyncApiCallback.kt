package com.mypurecloud.sdk.v2

interface AsyncApiCallback<T> {
    fun onCompleted(response: T)
    fun onFailed(exception: Throwable)
}
