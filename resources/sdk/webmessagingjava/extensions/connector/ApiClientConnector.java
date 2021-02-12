package cloud.genesys.webmessaging.sdk.connector;

import java.io.IOException;
import java.util.concurrent.Future;

public interface ApiClientConnector extends AutoCloseable {
    ApiClientConnectorResponse invoke(ApiClientConnectorRequest request) throws IOException;
}
