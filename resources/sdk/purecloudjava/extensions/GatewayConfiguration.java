package com.mypurecloud.sdk.v2;

public class GatewayConfiguration {
    private String host = null;
    private String protocol = null;
    private int port = -1;
    private String pathParamsLogin = null;
    private String pathParamsApi = null;
    private String username = null;
    private String password = null;

    GatewayConfiguration() {
        this.protocol = "https";
        this.port = -1;
        this.pathParamsLogin = "";
        this.pathParamsApi = "";
    }

    GatewayConfiguration(
        String host,
        String protocol,
        int port,
        String pathParamsLogin,
        String pathParamsApi,
        String username,
        String password
    ) {
        super();
        if (host != null && !host.isEmpty()) {
            this.host = host;
        }
        if (protocol != null && !protocol.isEmpty()) {
            this.protocol = protocol;
        }
        if (port > -1) {
            this.port = port;
        }
        if (pathParamsLogin != null && !pathParamsLogin.isEmpty()) {
            this.pathParamsLogin = pathParamsLogin;
        } else {
            this.pathParamsLogin = "";
        }
        if (pathParamsApi != null && !pathParamsApi.isEmpty()) {
            this.pathParamsApi = pathParamsApi;
        } else {
            this.pathParamsApi = "";
        }
        if (username != null && !username.isEmpty()) {
            this.username = username;
        }
        if (password != null && !password.isEmpty()) {
            this.password = password;
        }
    }

    GatewayConfiguration(
        String host,
        String protocol,
        int port,
        String pathParamsLogin,
        String pathParamsApi
    ) {
        super();
        if (host != null && !host.isEmpty()) {
            this.host = host;
        }
        if (protocol != null && !protocol.isEmpty()) {
            this.protocol = protocol;
        }
        if (port > -1) {
            this.port = port;
        }
        if (pathParamsLogin != null && !pathParamsLogin.isEmpty()) {
            this.pathParamsLogin = pathParamsLogin;
        } else {
            this.pathParamsLogin = "";
        }
        if (pathParamsApi != null && !pathParamsApi.isEmpty()) {
            this.pathParamsApi = pathParamsApi;
        } else {
            this.pathParamsApi = "";
        }
    }

    String getHost() {
        return this.host;
    }

    void setHost(String host) {
        if (host != null && !host.isEmpty()) {
            this.host = host;
        }
    }

    String getProtocol() {
        return this.protocol;
    }

    void setProtocol(String protocol) {
        if (protocol != null && !protocol.isEmpty()) {
            this.protocol = protocol;
        } else {
            this.protocol = "https";
        }
    }

    int getPort() {
        return this.port;
    }

    void setPort(int port) {
        if (port > -1) {
            this.port = port;
        } else {
            this.port = -1;
        }
    }

    String getPathParamsLogin() {
        return this.pathParamsLogin;
    }

    void setPathParamsLogin(String pathParams) {
        if (pathParams != null && !pathParams.isEmpty()) {
            this.pathParamsLogin = pathParams;
        } else {
            this.pathParamsLogin = "";
        }
    }

    String getPathParamsApi() {
        return this.pathParamsApi;
    }

    void setPathParamsApi(String pathParams) {
        if (pathParams != null && !pathParams.isEmpty()) {
            this.pathParamsApi = pathParams;
        } else {
            this.pathParamsApi = "";
        }
    }

    String getUsername() {
        return this.username;
    }

    void setUsername(String username) {
        if (username != null && !username.isEmpty()) {
            this.username = username;
        }
    }

    String getPassword() {
        return this.password;
    }

    void setPassword(String password) {
        if (password != null && !password.isEmpty()) {
            this.host = password;
        }
    }
}
