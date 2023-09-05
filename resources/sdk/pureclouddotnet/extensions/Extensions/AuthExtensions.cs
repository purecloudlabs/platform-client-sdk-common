﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using {{=it.packageName}}.Client;
using {{=it.packageName}}.Extensions;
using RestSharp;

namespace {{=it.packageName}}.Extensions
{
    public static class AuthExtensions
    {
        /// <summary>
        /// 
        /// </summary>
        /// <param name="apiClient"></param>
        /// <param name="clientId"></param>
        /// <param name="clientSecret"></param>
        /// <param name="redirectUri"></param>
        /// <param name="authorizationCode"></param>
        /// <returns></returns>
        public static AuthTokenInfo PostToken(this ApiClient apiClient, string clientId, string clientSecret,string redirectUri = "", string authorizationCode = "", bool isRefreshRequest = false)
        {
            var response = apiClient.PostTokenWithHttpInfo(clientId, clientSecret, redirectUri, authorizationCode, isRefreshRequest);
            return response.Data;
        }

        public static ApiResponse<AuthTokenInfo> PostTokenWithHttpInfo(this ApiClient apiClient, string clientId,
            string clientSecret, string redirectUri = "", string authorizationCode = "", bool isRefreshRequest = false)
        {
            var path_ = "/token";

            // This may be uninitialized if no API classes have been constructed yet
            if (apiClient.Configuration == null)
                apiClient.Configuration = new Configuration(apiClient);

            // If redirectUri is not null this is a Code Authorization grant and we need to save the clientId and clientSecret for a transparent token refresh
            if (!string.IsNullOrEmpty(redirectUri)) {
                apiClient.UsingCodeAuth = true;
                apiClient.ClientId = clientId;
                apiClient.ClientSecret = clientSecret;
            }

            var pathParams = new Dictionary<String, String>();
            var queryParams = new Dictionary<String, String>();
            var headerParams = new Dictionary<String, String>(apiClient.Configuration.DefaultHeader);
            var formParams = new Dictionary<String, String>();
            var fileParams = new Dictionary<String, FileParameter>();
            Object postBody = null;

            // to determine the Content-Type header
            String[] httpContentTypes = new String[]
            {
                "application/x-www-form-urlencoded"
            };
            String httpContentType = apiClient.SelectHeaderContentType(httpContentTypes);

            // to determine the Accept header
            String[] httpHeaderAccepts = new String[]
            {
                "application/json"
            };
            String httpHeaderAccept = apiClient.SelectHeaderAccept(httpHeaderAccepts);
            if (httpHeaderAccept != null)
                headerParams.Add("Accept", httpHeaderAccept);

            // Add form params
            if (isRefreshRequest) {
                formParams.Add("grant_type", "refresh_token");
                formParams.Add("refresh_token", authorizationCode);
            } else {
                formParams.Add("grant_type",
                    string.IsNullOrEmpty(authorizationCode) ? "client_credentials" : "authorization_code");
                if (!string.IsNullOrEmpty(authorizationCode))
                    formParams.Add("code", apiClient.ParameterToString(authorizationCode));
            }
            if (!string.IsNullOrEmpty(redirectUri))
                formParams.Add("redirect_uri", apiClient.ParameterToString(redirectUri));

            // authentication required
            var basicAuth =
                Convert.ToBase64String(Encoding.GetEncoding("ISO-8859-1").GetBytes(clientId + ":" + clientSecret));
            headerParams["Authorization"] = "Basic " + basicAuth;

            // make the HTTP request
            RestResponse response = (RestResponse)CallTokenApi(apiClient, path_,
                Method.Post, queryParams, postBody, headerParams, formParams, fileParams,
                pathParams, httpContentType);

            int statusCode = (int) response.StatusCode;

            if (statusCode >= 400)
                throw new ApiException(statusCode, "Error calling PostToken: " + response.Content, response.Content);
            else if (statusCode == 0)
                throw new ApiException(statusCode, "Error calling PostToken: " + response.ErrorMessage,
                    response.ErrorMessage);

            var authTokenInfo = (AuthTokenInfo) apiClient.Deserialize(response, typeof (AuthTokenInfo));
            apiClient.Configuration.AuthTokenInfo = authTokenInfo;

            return new ApiResponse<AuthTokenInfo>(statusCode,
                response.Headers
                 .Select(header => new { Name = header.GetType().GetProperty("Name").GetValue(header), Value = header.GetType().GetProperty("Value").GetValue(header) })
                                    .ToDictionary(header => header.Name.ToString(), header => header.Value.ToString()),
                authTokenInfo,
                response.Content,
                response.StatusDescription);
        }
         /// <summary>
        /// 
        /// </summary>
        /// <param name="apiClient"></param>
        /// <param name="clientId"></param>
        /// <param name="clientSecret"></param>
        /// <param name="orgName"></param>
        /// <param name="assertion"></param>
        /// <returns></returns>
        public static AuthTokenInfo PostTokenSaml2Bearer(this ApiClient apiClient, string clientId, string clientSecret,string orgName, string assertion)
        {
            var response = apiClient.PostTokenWithHttpInfoSaml2Bearer(clientId, clientSecret, orgName, assertion);
            return response.Data;
        }

        public static ApiResponse<AuthTokenInfo> PostTokenWithHttpInfoSaml2Bearer(this ApiClient apiClient, string clientId,
            string clientSecret, string orgName, string assertion)
        {
            var path_ = "/token";

            // This may be uninitialized if no API classes have been constructed yet
            if (apiClient.Configuration == null)
                apiClient.Configuration = new Configuration(apiClient);

            var pathParams = new Dictionary<String, String>();
            var queryParams = new Dictionary<String, String>();
            var headerParams = new Dictionary<String, String>(apiClient.Configuration.DefaultHeader);
            var formParams = new Dictionary<String, String>();
            var fileParams = new Dictionary<String, FileParameter>();
            Object postBody = null;

            // to determine the Content-Type header
            String[] httpContentTypes = new String[]
            {
                "application/x-www-form-urlencoded"
            };
            String httpContentType = apiClient.SelectHeaderContentType(httpContentTypes);

            // to determine the Accept header
            String[] httpHeaderAccepts = new String[]
            {
                "application/json"
            };
            String httpHeaderAccept = apiClient.SelectHeaderAccept(httpHeaderAccepts);
            if (httpHeaderAccept != null)
                headerParams.Add("Accept", httpHeaderAccept);

            // Add form params
            formParams.Add("grant_type","urn:ietf:params:oauth:grant-type:saml2-bearer");
            formParams.Add("orgName", orgName);
            formParams.Add("assertion", assertion);

            // authentication required
            var basicAuth =
                Convert.ToBase64String(Encoding.GetEncoding("ISO-8859-1").GetBytes(clientId + ":" + clientSecret));
            headerParams["Authorization"] = "Basic " + basicAuth;

            // make the HTTP request
            RestResponse response = (RestResponse)CallTokenApi(apiClient, path_,
                Method.Post, queryParams, postBody, headerParams, formParams, fileParams,
                pathParams, httpContentType);

            int statusCode = (int) response.StatusCode;

            if (statusCode >= 400)
                throw new ApiException(statusCode, "Error calling PostToken: " + response.Content, response.Content);
            else if (statusCode == 0)
                throw new ApiException(statusCode, "Error calling PostToken: " + response.ErrorMessage,
                    response.ErrorMessage);

            return new ApiResponse<AuthTokenInfo>(statusCode,
                response.Headers.Select(header => new { Name = header.GetType().GetProperty("Name").GetValue(header), Value = header.GetType().GetProperty("Value").GetValue(header) })
                                    .ToDictionary(header => header.Name.ToString(), header => header.Value.ToString()),
                (AuthTokenInfo) apiClient.Deserialize(response, typeof (AuthTokenInfo)),
                response.Content,
                response.StatusDescription);
        }

        private static Object CallTokenApi(ApiClient apiClient,
            String path, RestSharp.Method method, Dictionary<String, String> queryParams, Object postBody,
            Dictionary<String, String> headerParams, Dictionary<String, String> formParams,
            Dictionary<String, FileParameter> fileParams, Dictionary<String, String> pathParams,
            String contentType)
        {
            var regex = new Regex(@"://(api)\.");
            var authUrl = regex.Replace(apiClient.ClientOptions.BaseUrl.ToString(), "://login.");
            var options = new RestClientOptions(new Uri(authUrl));
            
            if (apiClient.ClientOptions != null && apiClient.ClientOptions.Proxy != null)
            {
                options = new RestClientOptions(new Uri(authUrl))
                {
                    Proxy = apiClient.ClientOptions.Proxy
                };
               
            }
            
            var restClient = new RestClient(options);

            var request = PrepareTokenRequest(
                path, method, queryParams, postBody, headerParams, formParams, fileParams,
                pathParams, contentType);

            var response = restClient.Execute(request);
            
            int statusCode = (int)response.StatusCode;
            var fullUrl = restClient.BuildUri(request);
            string url = fullUrl == null ? path : fullUrl.ToString();
            apiClient.Configuration.Logger.Trace(method.ToString(), url, postBody, statusCode, headerParams, response.Headers.Select(header => new { Name = header.GetType().GetProperty("Name").GetValue(header), Value = header.GetType().GetProperty("Value").GetValue(header) })
                                    .ToDictionary(header => header.Name.ToString(), header => header.Value.ToString()));
            apiClient.Configuration.Logger.Debug(method.ToString(), url, postBody, statusCode, headerParams);

            if (statusCode >= 400 || statusCode == 0)
                apiClient.Configuration.Logger.Error(method.ToString(), url, postBody, response.Content, statusCode, headerParams, response.Headers.Select(header => new { Name = header.GetType().GetProperty("Name").GetValue(header), Value = header.GetType().GetProperty("Value").GetValue(header) })
                                    .ToDictionary(header => header.Name.ToString(), header => header.Value.ToString()));

            return (Object) response;
        }

        private static RestRequest PrepareTokenRequest(
            String path, RestSharp.Method method, Dictionary<String, String> queryParams, Object postBody,
            Dictionary<String, String> headerParams, Dictionary<String, String> formParams,
            Dictionary<String, FileParameter> fileParams, Dictionary<String, String> pathParams,
            String contentType)
        {
            var request = new RestRequest(path, method);

            // add path parameter, if any
            foreach (var param in pathParams)
                request.AddParameter(param.Key, param.Value, ParameterType.UrlSegment);

            // add header parameter, if any
            foreach (var param in headerParams)
                request.AddHeader(param.Key, param.Value);

            // add query parameter, if any
            foreach (var param in queryParams)
                request.AddQueryParameter(param.Key, param.Value);

            // add form parameter, if any
            foreach (var param in formParams)
                request.AddParameter(param.Key, param.Value);

            // add file parameter, if any
            foreach (var param in fileParams)
                request.AddFile(param.Value.Name, param.Value.GetFile, param.Value.FileName, param.Value.ContentType);

            if (postBody != null) // http body (model or byte[]) parameter
            {
                if (postBody.GetType() == typeof (String))
                {
                    request.AddParameter("application/json", postBody, ParameterType.RequestBody);
                }
                else if (postBody.GetType() == typeof (byte[]))
                {
                    request.AddParameter(contentType, postBody, ParameterType.RequestBody);
                }
            }

            return request;
        }
    }
}
