import base64, imp, os, requests, sys, unittest, uuid, time
from pprint import pprint
from retry import retry

# Load SDK from local build
sys.path.append('../../../../output/purecloudpython/build/build/lib')
import PureCloudPlatformClientV2


class SdkTests_mtls(unittest.TestCase):
	lastResult = None

	userId = None
	userEmail = None
	userName = 'Python SDK Tester'
	userDepartment = 'Ministry of Testing'
	userProfileSkill = 'Testmaster'
	busyPresenceId = '31fe3bac-dea6-44b7-bed7-47f91660a1a0'
	availablePresenceId = '6a3af858-942f-489d-9700-5f9bcdcdae9b'

	def setUp(self):
		# Skip if there has been a failure
		if SdkTests_mtls.lastResult != None and (len(SdkTests_mtls.lastResult.failures) > 0 or len(SdkTests_mtls.lastResult.errors) > 0):
			print("=== WARNING: Previous test failed, skipping current test ===", flush=True)
			self.skipTest('Previous test failed')

	def run(self, result=None):
		# Store this execution's result as the last one
		SdkTests_mtls.lastResult = result

		# Run the test
		unittest.TestCase.run(self, result)

	def test_1_trace_basic_information(self):
		print("=== ENTERING test_1_trace_basic_information() ===")
		print('PURECLOUD_ENVIRONMENT=%s' % (os.environ.get('PURECLOUD_ENVIRONMENT')))
		self.assertIsNotNone(os.environ.get('PURECLOUD_ENVIRONMENT'))

		print('PURECLOUD_CLIENT_ID=%s' % (os.environ.get('PURECLOUD_CLIENT_ID')))
		self.assertIsNotNone(os.environ.get('PURECLOUD_CLIENT_ID'))

		self.assertIsNotNone(os.environ.get('PURECLOUD_CLIENT_SECRET'))

		SdkTests_mtls.userEmail = '%s@%s' % (uuid.uuid4(), os.environ.get('PURECLOUD_ENVIRONMENT'))
		print(SdkTests_mtls.userEmail)

		print(PureCloudPlatformClientV2)
		print("=== EXITING test_1_trace_basic_information() ===\n")

	def test_2_mtls_gw_authenticate(self):
		print("=== ENTERING test_mtls_authenticate() ===")
		environment = os.environ.get('PURECLOUD_ENVIRONMENT');
		region = self.purecloudregiontest(environment)
		print(f"Using region: {region}")
		if isinstance(region,PureCloudPlatformClientV2.PureCloudRegionHosts):
			PureCloudPlatformClientV2.configuration.host = region.get_api_host()
			print(f"API host set to: {region.get_api_host()}")
		elif isinstance(region,str):
			PureCloudPlatformClientV2.configuration.host = 'https://api.%s' % (environment)
			print("Environment not found in PureCloudRegionHosts defaulting to string value")
			print(f"API host set to: https://api.{environment}")

        #Set the client certificate and key files here. For CA verification, the default Mozilla store is used. 
        #To use a custom CA, provide its certificate as the third parameter.
		cacert = "mtls-certs/ca-chain.cert.pem"
		cert = "mtls-certs/localhost.cert.pem"
		key = "mtls-certs/localhost.key.pem"
		#Join the script full path with the certificate and key files
		cacert = os.path.join(os.path.dirname(__file__), cacert)
		cert = os.path.join(os.path.dirname(__file__), cert)
		key = os.path.join(os.path.dirname(__file__), key)		
		PureCloudPlatformClientV2.configuration.set_mtls_certificates(cert, key, cacert)
                
		# Authenticate with client credentials and pass the apiclient instance into the usersapi
		print("Authenticating with client credentials...")
		SdkTests_mtls.apiclient_mtls = PureCloudPlatformClientV2.api_client.ApiClient()
		SdkTests_mtls.apiclient_mtls.set_gateway("locahlost","https",4027,"login","api")
		SdkTests_mtls.apiclient_mtls.get_client_credentials_token(os.environ.get('PURECLOUD_CLIENT_ID'), os.environ.get('PURECLOUD_CLIENT_SECRET'))
		SdkTests_mtls.users_api_mtls = PureCloudPlatformClientV2.UsersApi(SdkTests_mtls.apiclient_mtls)
		print(f"Authentication successful access_token: {SdkTests_mtls.apiclient_mtls}")
		self.create_user(SdkTests_mtls.users_api_mtls)
		self.delete_user(SdkTests_mtls.users_api_mtls)
		print("=== EXITING test_mtls_authenticate() ===\n")

	def test_3_proxy_authenticate(self):
		print("=== ENTERING test_proxy_authenticate() ===")
		environment = os.environ.get('PURECLOUD_ENVIRONMENT')
		region = self.purecloudregiontest(environment)
		print(f"Using region: {region}")
		if isinstance(region,PureCloudPlatformClientV2.PureCloudRegionHosts):
			PureCloudPlatformClientV2.configuration.host = region.get_api_host()
			print(f"API host set to: {region.get_api_host()}")
		elif isinstance(region,str):
			PureCloudPlatformClientV2.configuration.host = 'https://api.%s' % (environment)
			print("Environment not found in PureCloudRegionHosts defaulting to string value")
			print(f"API host set to: https://api.{environment}")
		
		#Proxy setting and the request should go via proxy.
		PureCloudPlatformClientV2.configuration.proxy="http://localhost:4001"
                
		# Authenticate with client credentials and pass the apiclient instance into the usersapi
		print("Authenticating with client credentials...")
		SdkTests_mtls.apiclient_proxy = PureCloudPlatformClientV2.api_client.ApiClient()
		SdkTests_mtls.apiclient_proxy.get_client_credentials_token(os.environ.get('PURECLOUD_CLIENT_ID'), os.environ.get('PURECLOUD_CLIENT_SECRET'))
		SdkTests_mtls.users_api_proxy = PureCloudPlatformClientV2.UsersApi(SdkTests_mtls.apiclient_proxy)
		print(f"Authentication successful access_token: {SdkTests_mtls.apiclient_proxy}")
		self.create_user(SdkTests_mtls.users_api_proxy)
		self.delete_user(SdkTests_mtls.users_api_proxy)
		print("=== EXITING test_proxy_authenticate() ===\n")

	def create_user(self, users_api):
		print("=== ENTERING create_user() ===")
		body = PureCloudPlatformClientV2.CreateUser()
		body.name = SdkTests_mtls.userName
		body.email = SdkTests_mtls.userEmail
		body.password = '%s!@#$1234asdfASDF' % (uuid.uuid4())
		print(f"Creating user with name: {body.name}, email: {body.email}")
		  		
		user = users_api.post_users(body)
		print(f"User created successfully")

		SdkTests_mtls.userId = user.id
		print(f"User ID: {SdkTests_mtls.userId}")
		self.assertEqual(user.name, SdkTests_mtls.userName)
		self.assertEqual(user.email, SdkTests_mtls.userEmail)
		print(SdkTests_mtls.userId)
		print("=== EXITING create_user() ===\n")

	def delete_user(self, users_api):
		print("=== ENTERING delete_user() ===")
		print(f"Deleting user {SdkTests_mtls.userId}")
		users_api.delete_user(SdkTests_mtls.userId)
		print(f"User {SdkTests_mtls.userId} deleted successfully")
		print("=== EXITING delete_user() ===\n")

	def purecloudregiontest(self,x):
		print(f"=== ENTERING purecloudregiontest() with environment {x} ===")
		result = {
			'mypurecloud.com': PureCloudPlatformClientV2.PureCloudRegionHosts.us_east_1,
			'mypurecloud.ie': PureCloudPlatformClientV2.PureCloudRegionHosts.eu_west_1,
			'mypurecloud.com.au': PureCloudPlatformClientV2.PureCloudRegionHosts.ap_southeast_2,
			'mypurecloud.jp': PureCloudPlatformClientV2.PureCloudRegionHosts.ap_northeast_1,
			'mypurecloud.de': PureCloudPlatformClientV2.PureCloudRegionHosts.eu_central_1,
			'usw2.pure.cloud': PureCloudPlatformClientV2.PureCloudRegionHosts.us_west_2,
			'cac1.pure.cloud': PureCloudPlatformClientV2.PureCloudRegionHosts.ca_central_1,
			'apne2.pure.cloud': PureCloudPlatformClientV2.PureCloudRegionHosts.ap_northeast_2,
			'euw2.pure.cloud': PureCloudPlatformClientV2.PureCloudRegionHosts.eu_west_2,
			'aps1.pure.cloud': PureCloudPlatformClientV2.PureCloudRegionHosts.ap_south_1,
			'use2.us-gov-pure.cloud': PureCloudPlatformClientV2.PureCloudRegionHosts.us_east_2
		}.get(x,x)
		print(f"=== EXITING purecloudregiontest() with result: {result} ===")
		return result


if __name__ == '__main__':
	unittest.sortTestMethodsUsing(None)
	print("Running SdkTests_mtls Tests")
	unittest.main()
	print("SdkTests_mtls Tests Complete")	
 