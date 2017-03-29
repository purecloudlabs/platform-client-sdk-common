require 'rest_client'
require 'json'
require 'base64'

module PureCloud
  class << self
    # Authenticates to PureCloud using the client credientals OAuth grant.
    #
    # @param client_id OAuth client id
    # @param client_secret OAuth client secret
    # @param environment PureCloud environment (mypurecloud.com, mypurecloud.ie, mypurecloud.com.au, etc)
    def authenticate_with_client_credentials(client_id, client_secret, environment = nil)
      environment ||= "mypurecloud.com"
      self.configure.host = 'api.' + environment;

      basic = Base64.strict_encode64("#{client_id}:#{client_secret}")

      tokenData = JSON.parse RestClient.post("https://login.#{environment}/token",
                              {:grant_type => 'client_credentials'},
                              :Authorization => "Basic " + basic,
                              'content-type'=> 'application/x-www-form-urlencoded',
                              :accept => :json)
      self.configure.access_token = tokenData["access_token"]
    end

    # Retrieves an Access token given an authorization code (authorization code grant)
    #
    # @param auth_code Authorization code from the OAuth redirec
    # @param client_id OAuth client id
    # @param client_secret OAuth client secret
    # @param client_secret OAuth redirect URI
    # @param environment (Optional) PureCloud environment (mypurecloud.com, mypurecloud.ie, mypurecloud.com.au, etc)
    def get_access_token_from_auth_code(auth_code, client_id, client_secret, redirect_uri, environment = nil)
      environment ||= "mypurecloud.com"

      tokenFormData = {
        "grant_type" => "authorization_code",
        "code" => auth_code,
        "redirect_uri" => redirect_uri
      }

      tokenResponse =JSON.parse RestClient.post "https://#{client_id}:#{client_secret}@login.#{environment}/token", tokenFormData

      return tokenResponse['access_token'];
    end
  end
end
