package cloud.genesys.webmessaging.sdk.connector;

public interface ApiClientConnectorProvider {
    ApiClientConnector create(ApiClientConnectorProperties properties);
}
