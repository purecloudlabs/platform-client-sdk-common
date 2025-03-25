using System;
using System.Net;
using System.Net.Http;

namespace {{=it.packageName }}.Client
{
    public class ClientRestOptions
    {
        ///<Summary>
        /// Base Url
        ///</Summary>
        public Uri BaseUrl { get; set; }
        /// <summary>
        /// API prefix
        /// </summary>
        public string Prefix { get; set; } = "api";
        private System.Net.IWebProxy proxy;
        private HttpMessageHandler httpMessageHandler;

        ///<Summary>
        /// Gets or Sets the HttpMessageHandler
        ///</Summary>
        public HttpMessageHandler HttpMessageHandler
        {
            get
            {
                return httpMessageHandler;
            }
            set
            {
                this.httpMessageHandler = value;
            }
        }

        ///<Summary>
        /// Gets or Sets the Proxy
        ///</Summary>
        public System.Net.IWebProxy Proxy
        {
            get
            {
                return proxy;
            }
            set
            {
                this.proxy = value;
            }
        }
    }
}