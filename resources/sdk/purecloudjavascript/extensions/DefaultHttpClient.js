import { default as axios } from 'axios';
import AbstractHttpClient from './AbstractHttpClient.js';
import HttpRequestOptions from './HttpRequestOptions.js';

// Default client is Axios
class DefaultHttpClient extends AbstractHttpClient{

    constructor(timeout, httpsAgent) {
        super();
        if (timeout !== null && timeout !== undefined) this.setTimeout(timeout);
        else this.timeout = 16000;
        if (httpsAgent !== null && httpsAgent !== undefined) this.setHttpsAgent(httpsAgent);
        else this.httpsAgent;
        this._axiosInstance = axios.create({});

        // Attach interceptors for pre and post hooks
        this._attachInterceptors();
    }

    _attachInterceptors() {
        // Request interceptor (for pre-hooks)
        this._axiosInstance.interceptors.request.use(
            async (config) => {
                if (this.preHook && typeof this.preHook === 'function') {
                    console.log('Running Pre-Hook: Request');
                    await this.preHook(config); // Call the custom pre-hook
                }
                return config;
            },
            (error) => {
                // Handle errors before the request is sent
                console.error('Request Pre-Hook Error:', error.message);
                return Promise.reject(error);
            }
        );

        // Response interceptor (for post-hooks)
        this._axiosInstance.interceptors.response.use(
            async (response) => {
                if (this.postHook && typeof this.postHook === 'function') {
                    console.log('Running Post-Hook: Response');
                    await this.postHook(response, null); // Call the custom post-hook
                }
                return response;
            },
            async (error) => {
                console.error('Post-Hook: Response Error', error.message);
                // Optionally call post-hook in case of errors
                if (this.postHook && typeof this.postHook === 'function') {
                    await this.postHook(null, error); // Pass the error to post-hook
                }
                return Promise.reject(error);
            }
        );
    }

    request(httpRequestOptions) {
        if(!(httpRequestOptions instanceof HttpRequestOptions)) {
            throw new Error(`httpRequestOptions must be instance of HttpRequestOptions `);
        }
        const config = this.toAxiosConfig(httpRequestOptions)
        return this._axiosInstance.request(config);
    }

    // Method to generate Axios-compatible config
    toAxiosConfig(httpRequestOptions) {
        if (!httpRequestOptions.url || !httpRequestOptions.method) {
            throw new Error(
                "Mandatory fields 'url' and 'method' must be set before making a request"
            );
        }

        var config = {
            url: httpRequestOptions.url,
            method: httpRequestOptions.method
        };

        if (httpRequestOptions.params) config.params = httpRequestOptions.params;
        if (httpRequestOptions.headers) config.headers = httpRequestOptions.headers;
        if(httpRequestOptions.data) config.data = httpRequestOptions.data;
        if (this.timeout != null && this.timeout != undefined) config.timeout = this.timeout;
        if (this.httpsAgent) config.httpsAgent = this.httpsAgent

        return config;
    }
}

export default DefaultHttpClient;