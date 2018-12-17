package com.mypurecloud.sdk.v2.guest.connector;

public interface ApiClientConnectorProvider {
    ApiClientConnector create(ApiClientConnectorProperties properties);
}
