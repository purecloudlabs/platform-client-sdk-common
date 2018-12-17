package com.mypurecloud.sdk.v2.guest.connector;

public interface ApiClientConnectorProperties {
    <T> T getProperty(String key, Class<T> propertyClass, T defaultValue);
}
