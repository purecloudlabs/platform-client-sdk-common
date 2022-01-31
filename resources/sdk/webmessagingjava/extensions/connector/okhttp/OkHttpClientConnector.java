package cloud.genesys.webmessaging.sdk.connector.okhttp;

import com.google.common.util.concurrent.SettableFuture;
import cloud.genesys.webmessaging.sdk.connector.ApiClientConnector;
import cloud.genesys.webmessaging.sdk.connector.ApiClientConnectorRequest;
import cloud.genesys.webmessaging.sdk.connector.ApiClientConnectorResponse;
import okhttp3.*;
import org.jetbrains.annotations.NotNull;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.Future;

public class OkHttpClientConnector implements ApiClientConnector {
    private final OkHttpClient client;

    public OkHttpClientConnector(OkHttpClient client) {
        this.client = client;
    }

    @Override
    public ApiClientConnectorResponse invoke(ApiClientConnectorRequest request) throws IOException {
        Call call = client.newCall(buildRequest(request));
        return new OkHttpResponse(call.execute());
    }

    private Request buildRequest(ApiClientConnectorRequest request) throws IOException {
        Request.Builder builder = new Request.Builder()
                .url(request.getUrl());

        Map<String, String> headers = request.getHeaders();
        if (headers != null && !headers.isEmpty()) {
            for (Map.Entry<String, String> header : headers.entrySet()) {
                builder = builder.addHeader(header.getKey(), header.getValue());
            }
        }

        String method = request.getMethod();
        if ("GET".equals(method)) {
            builder = builder.get();
        }
        else if ("HEAD".equals(method)) {
            builder = builder.head();
        }
        else if ("POST".equals(method)) {
            builder = builder.post(createBody(request));
        }
        else if ("PUT".equals(method)) {
            builder = builder.put(createBody(request));
        }
        else if ("DELETE".equals(method)) {
            builder = builder.delete();
        }
        else if ("PATCH".equals(method)) {
            builder = builder.patch(createBody(request));
        }
        else {
            throw new IllegalStateException("Unknown method type " + method);
        }

        return builder.build();
    }

    private RequestBody createBody(ApiClientConnectorRequest request) throws IOException {
        String contentType = "application/json";
        Map<String, String> headers = request.getHeaders();
        if (headers != null && !headers.isEmpty()) {
            for (String name : headers.keySet()) {
                if (name.equalsIgnoreCase("content-type")) {
                    contentType = headers.get(name);
                    break;
                }
            }
        }
        if (request.hasBody()) {
            return RequestBody.create(MediaType.parse(contentType), request.readBody());
        }
        return RequestBody.create(null, new byte[0]);
    }

    @Override
    public void close() throws Exception { }
}
