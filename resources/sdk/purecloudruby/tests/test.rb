require 'minitest/autorun'
puts Dir.pwd
require 'purecloudplatformclientv2'
require 'date'

class PureCloudGemTest < Minitest::Test

    def setup
        @secret = ENV['PURECLOUD_CLIENT_SECRET']
        @id = ENV['PURECLOUD_CLIENT_ID']
        environment = ENV['PURECLOUD_ENVIRONMENT']

        @authToken = PureCloud.authenticate_with_client_credentials @id, @secret, environment
        PureCloud.configure.debugging = true
        PureCloud.configure.host = "api.#{environment}"
    end

    def test_auth_api
        auth_api = PureCloud::AuthorizationApi.new
        roles = auth_api.get_authorization_roles
        refute_nil roles
        #puts roles
    end

    def test_org_config
        config = PureCloud::Configuration.default
        config.access_token = @authToken;

        org_api = PureCloud::OrganizationApi.new(PureCloud::ApiClient.new( config ))
        org = org_api.get_organizations_me

        refute_nil org
        refute_nil org.id
    end

    def test_oauth_api
        oauth_api = PureCloud::OAuthApi.new
        
        body = PureCloud::OAuthClient.new({
                :name => 'Gem Test Client',
                :description => "generated from gem test script",
                :authorizedGrantType => "TOKEN"})

        client = oauth_api.post_oauth_clients body
        refute_nil client

        oauth_api.delete_oauth_client client.id

    end

    def test_notifications
        notification_api = PureCloud::NotificationsApi.new

        topics = notification_api.get_notifications_availabletopics
        refute_nil topics
        assert topics.entities.count > 0

    end

    def test_analytics_query
        routing_api = PureCloud::RoutingApi.new
        queues = routing_api.get_routing_queues
        refute_nil queues

        queueId = queues.entities[0].id;

        startTime = DateTime.now.new_offset(0)
        endTime = startTime - 1

        intervalString = "#{endTime.strftime("%FT%R")}:00.000Z/#{startTime.strftime("%FT%R")}:00.000Z"

        queryBody = PureCloud::AggregationQuery.new({
                    :interval => intervalString,
                    :groupBy =>  ["queueId"],
                    :metrics => ["nOffered","tAnswered","tTalk"],
                    :filter => {
                       :type=> "and",
                       :clauses=> [
                         {
                           :type=> "or",
                           :predicates=> [
                             {
                               :dimension=> "queueId",
                               :value=> queueId
                             }
                           ]
                         }
                       ]
                    }
            })


        analytics_api = PureCloud::AnalyticsApi.new
        result = analytics_api.post_analytics_conversations_aggregates_query queryBody

        refute_nil result

    end

    def test_estimated_wait_time
        routing_api = PureCloud::RoutingApi.new

        queues = routing_api.get_routing_queues
        refute_nil queues
    end

    def test_get_notification_topics
        api = PureCloud::NotificationsApi.new

        topics = api.get_notifications_availabletopics :expand=>'description,schema'
        refute_nil topics
    end

end
