import base64, imp, os, requests, sys, unittest, uuid, time
from pprint import pprint
from retry import retry

# Load SDK from local build
sys.path.append('../../../../output/purecloudpython/build/build/lib')
import PureCloudPlatformClientV2


class SdkTests_proxy(unittest.TestCase):
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
		if SdkTests_proxy.lastResult != None and (len(SdkTests_proxy.lastResult.failures) > 0 or len(SdkTests_proxy.lastResult.errors) > 0):
			print("=== WARNING: Previous test failed, skipping current test ===", flush=True)
			self.skipTest('Previous test failed')

	def run(self, result=None):
		# Store this execution's result as the last one
		SdkTests_proxy.lastResult = result

		# Run the test
		unittest.TestCase.run(self, result)

	def test_1_trace_basic_information(self):
		print("=== ENTERING test_1_trace_basic_information() ===")
		print('PURECLOUD_ENVIRONMENT=%s' % (os.environ.get('PURECLOUD_ENVIRONMENT')))
		self.assertIsNotNone(os.environ.get('PURECLOUD_ENVIRONMENT'))

		print('PURECLOUD_CLIENT_ID=%s' % (os.environ.get('PURECLOUD_CLIENT_ID')))
		self.assertIsNotNone(os.environ.get('PURECLOUD_CLIENT_ID'))

		self.assertIsNotNone(os.environ.get('PURECLOUD_CLIENT_SECRET'))

		SdkTests_proxy.userEmail = '%s@%s' % (uuid.uuid4(), os.environ.get('PURECLOUD_ENVIRONMENT'))
		print(SdkTests_proxy.userEmail)

		print(PureCloudPlatformClientV2)
		print("=== EXITING test_1_trace_basic_information() ===\n")

	def test_2_proxy_authenticate(self):
		print("=== ENTERING test_2_proxy_authenticate() ===")
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
		PureCloudPlatformClientV2.configuration.verify_ssl=False
		PureCloudPlatformClientV2.configuration.proxy="http://localhost:4001"
                
		# Authenticate with client credentials and pass the apiclient instance into the usersapi
		print("Authenticating with client credentials...")
		SdkTests_proxy.apiclient_proxy = PureCloudPlatformClientV2.api_client.ApiClient()
		SdkTests_proxy.apiclient_proxy.get_client_credentials_token(os.environ.get('PURECLOUD_CLIENT_ID'), os.environ.get('PURECLOUD_CLIENT_SECRET'))
		SdkTests_proxy.users_api_proxy = PureCloudPlatformClientV2.UsersApi(SdkTests_proxy.apiclient_proxy)
		print(f"Authentication successful access_token: {SdkTests_proxy.apiclient_proxy}")
		self.create_user(SdkTests_proxy.users_api_proxy)
		self.delete_user(SdkTests_proxy.users_api_proxy)
		print("=== EXITING test_2_proxy_authenticate() ===\n")

	def create_user(self, users_api):
		print("=== ENTERING create_user() ===")
		body = PureCloudPlatformClientV2.CreateUser()
		body.name = SdkTests_proxy.userName
		body.email = SdkTests_proxy.userEmail
		body.password = '%s!@#$1234asdfASDF' % (uuid.uuid4())
		print(f"Creating user with name: {body.name}, email: {body.email}")
		  		
		user = users_api.post_users(body)
		print(f"User created successfully")

		SdkTests_proxy.userId = user.id
		print(f"User ID: {SdkTests_proxy.userId}")
		self.assertEqual(user.name, SdkTests_proxy.userName)
		self.assertEqual(user.email, SdkTests_proxy.userEmail)
		print(SdkTests_proxy.userId)
		print("=== EXITING create_user() ===\n")

	def delete_user(self, users_api):
		print("=== ENTERING delete_user() ===")
		print(f"Deleting user {SdkTests_proxy.userId}")
		users_api.delete_user(SdkTests_proxy.userId)
		print(f"User {SdkTests_proxy.userId} deleted successfully")
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
			'use2.us-gov-pure.cloud': PureCloudPlatformClientV2.PureCloudRegionHosts.us_east_2,
			'mxc1.pure.cloud': PureCloudPlatformClientV2.PureCloudRegionHosts.mx_central_1,
			'apse1.pure.cloud': PureCloudPlatformClientV2.PureCloudRegionHosts.ap_southeast_1
		}.get(x,x)
		print(f"=== EXITING purecloudregiontest() with result: {result} ===")
		return result


if __name__ == '__main__':
	unittest.sortTestMethodsUsing(None)
	print("Running SdkTests_proxy Tests")
	unittest.main()
	print("SdkTests_proxy Tests Complete")	
 