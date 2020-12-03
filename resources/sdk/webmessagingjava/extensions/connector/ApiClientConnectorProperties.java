package cloud.genesys.webmessaging.sdk.connector;

public interface ApiClientConnectorProperties {
    <T> T getProperty(String key, Class<T> propertyClass, T defaultValue);
}
