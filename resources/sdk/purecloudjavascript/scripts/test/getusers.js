const platformClient = require("purecloud-platform-client-v2");
const assert = require("assert");

const client = platformClient.ApiClient.instance;
client.setEnvironment(platformClient.PureCloudRegionHosts.us_east_1); // Genesys Cloud region

// Manually set auth token or use loginImplicitGrant(...) or loginClientCredentialsGrant(...) or loginPKCEGrant(...)
//client.setAccessToken("your_access_token");

const PURECLOUD_CLIENT_ID = "7de3af06-c0b3-4f9b-af45-72f4a14037cc";
const PURECLOUD_CLIENT_SECRET = "qLh-825gtjPrIY2kcWKAkmlaSgi6Z1Ws2BAyixWbTrs"
let PURECLOUD_ENVIRONMENT = platformClient.PureCloudRegionHosts.us_east_1






let opts = {
    "pageSize": 25, // Number | Page size
    "pageNumber": 1, // Number | Page number
    "id": ["id_example"], // [String] | A list of user IDs to fetch by bulk
    "jabberId": ["jabberId_example"], // [String] | A list of jabberIds to fetch by bulk (cannot be used with the id parameter)
    "sortOrder": "ASC", // String | Ascending or descending sort order
    "expand": ["expand_example"], // [String] | Which fields, if any, to expand. Note, expand parameters are resolved with a best effort approach and not guaranteed to be returned. If requested expand information is absolutely required, it's recommended to use specific API requests instead.
    "integrationPresenceSource": "integrationPresenceSource_example", // String | Gets an integration presence for users instead of their defaults. This parameter will only be used when presence is provided as an expand. When using this parameter the maximum number of users that can be returned is 100.
    "state": "active" // String | Only list users of this state
};




console.log(PURECLOUD_ENVIRONMENT)
console.log(PURECLOUD_CLIENT_ID)
console.log("PURECLOUD_CLIENT_ID")


client.setEnvironment(PURECLOUD_ENVIRONMENT);
client
    .loginClientCredentialsGrant(PURECLOUD_CLIENT_ID, PURECLOUD_CLIENT_SECRET)
    .then(() => done())
    .catch((err) => console.log(err));

client.setGateway({
    host:"localhost",
    port:"4333",
    protocol : "https"
})

client.setMTLSCertificates('mtls-test/localhost.cert.pem', 'mtls-test/localhost.key.pem', 'mtls-test/ca-chain.cert.pem')

let apiInstance = new platformClient.UsersApi();
// Get the list of available users.
apiInstance.getUsers(opts)
    .then((data) => {
        console.log(`getUsers success! data: ${JSON.stringify(data, null, 2)}`);
    })
    .catch((err) => {
        console.log("There was a failure calling getUsers");
        console.error(err);
    });


function setEnvironment() {
    switch (PURECLOUD_ENVIRONMENT) {
        case 'mypurecloud.com':
            return platformClient.PureCloudRegionHosts.us_east_1;
        case 'mypurecloud.ie':
            return platformClient.PureCloudRegionHosts.eu_west_1;
        case 'mypurecloud.com.au':
            return platformClient.PureCloudRegionHosts.ap_southeast_2;
        case 'mypurecloud.jp':
            return platformClient.PureCloudRegionHosts.ap_northeast_1;
        case 'mypurecloud.de':
            return platformClient.PureCloudRegionHosts.eu_central_1;
        case 'usw2.pure.cloud':
            return platformClient.PureCloudRegionHosts.us_west_2;
        case 'cac1.pure.cloud':
            return platformClient.PureCloudRegionHosts.ca_central_1;
        case 'apne2.pure.cloud':
            return platformClient.PureCloudRegionHosts.ap_northeast_2;
        case 'euw2.pure.cloud':
            return platformClient.PureCloudRegionHosts.eu_west_2;
        case 'aps1.pure.cloud':
            return platformClient.PureCloudRegionHosts.ap_south_1;
        case 'use2.us-gov-pure.cloud':
            return platformClient.PureCloudRegionHosts.us_east_2;
        default:
            console.log('Value does not exist in PureCloudRegionHosts defaulting to PURECLOUD ENVIRONMENT value');
            return PURECLOUD_ENVIRONMENT;
    }
}
