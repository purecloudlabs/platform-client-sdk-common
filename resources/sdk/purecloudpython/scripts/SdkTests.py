import base64, imp, os, requests, sys, unittest, uuid
from pprint import pprint

# Load SDK from local build
sys.path.append('../../../../output/purecloudpython/build/build/lib')
import PureCloudPlatformClientV2


class SdkTests(unittest.TestCase):
	lastResult = None

	userId = None
	userEmail = None;
	userName = 'Python SDK Tester'
	userDepartment = 'Ministry of Testing'
	userProfileSkill = 'Testmaster'
	busyPresenceId = '31fe3bac-dea6-44b7-bed7-47f91660a1a0'
	availablePresenceId = '6a3af858-942f-489d-9700-5f9bcdcdae9b'

	def setUp(self):
		# Skip if there has been a failure
		if SdkTests.lastResult != None and (len(SdkTests.lastResult.failures) > 0 or len(SdkTests.lastResult.errors) > 0):
			self.skipTest('Previous test failed')

	def run(self, result=None):
		# Store this execution's result as the last one
		SdkTests.lastResult = result

		# Run the test
		unittest.TestCase.run(self, result)

	def test_1_trace_basic_information(self):
		print('PURECLOUD_ENVIRONMENT=%s' % (os.environ.get('PURECLOUD_ENVIRONMENT')))
		self.assertIsNotNone(os.environ.get('PURECLOUD_ENVIRONMENT'))

		print('PURECLOUD_CLIENT_ID=%s' % (os.environ.get('PURECLOUD_CLIENT_ID')))
		self.assertIsNotNone(os.environ.get('PURECLOUD_CLIENT_ID'))

		self.assertIsNotNone(os.environ.get('PURECLOUD_CLIENT_SECRET'))

		SdkTests.userEmail = '%s@%s' % (uuid.uuid4(), os.environ.get('PURECLOUD_ENVIRONMENT'))
		print(SdkTests.userEmail)

		print(PureCloudPlatformClientV2)

	def test_2_authenticate(self):
		environment = os.environ.get('PURECLOUD_ENVIRONMENT');
		region = self.purecloudregiontest(environment)
		if isinstance(region,PureCloudPlatformClientV2.PureCloudRegionHosts):
			PureCloudPlatformClientV2.configuration.host = region.get_api_host()
		elif isinstance(region,str):
			PureCloudPlatformClientV2.configuration.host = 'https://api.%s' % (environment)
			print("Environment not found in PureCloudRegionHosts defaulting to string value")
		
	    # Authenticate with client credentials and pass the apiclient instance into the usersapi
		apiclient = PureCloudPlatformClientV2.api_client.ApiClient().get_client_credentials_token(os.environ.get('PURECLOUD_CLIENT_ID'), os.environ.get('PURECLOUD_CLIENT_SECRET'))
		SdkTests.users_api = PureCloudPlatformClientV2.UsersApi(apiclient)

	def test_3_create_user(self):
		body = PureCloudPlatformClientV2.CreateUser()
		body.name = SdkTests.userName
		body.email = SdkTests.userEmail
		body.password = '%s!@#$1234asdfASDF' % (uuid.uuid4())

		user = SdkTests.users_api.post_users(body)

		SdkTests.userId = user.id
		self.assertEqual(user.name, SdkTests.userName)
		self.assertEqual(user.email, SdkTests.userEmail)

	def test_4_update_user(self):
		updateUser = PureCloudPlatformClientV2.UpdateUser()
		updateUser.department = SdkTests.userDepartment
		updateUser.version = 1

		user = SdkTests.users_api.patch_user(SdkTests.userId, updateUser)

		self.assertEqual(user.id, SdkTests.userId)
		self.assertEqual(user.name, SdkTests.userName)
		self.assertEqual(user.email, SdkTests.userEmail)
		self.assertEqual(user.department, SdkTests.userDepartment)

	def test_5_set_profile_skills(self):
		skills = SdkTests.users_api.put_user_profileskills(SdkTests.userId, [ SdkTests.userProfileSkill ])

		self.assertEqual(len(skills), 1)
		self.assertEqual(skills[0], SdkTests.userProfileSkill)

	def test_6_get_user(self):
		user = SdkTests.users_api.get_user(SdkTests.userId, expand = [ 'profileSkills' ])

		self.assertEqual(user.id, SdkTests.userId)
		self.assertEqual(user.name, SdkTests.userName)
		self.assertEqual(user.email, SdkTests.userEmail)
		self.assertEqual(user.department, SdkTests.userDepartment)
		self.assertEqual(user.profile_skills[0], SdkTests.userProfileSkill)

	def test_7_reauthenticate(self):
		PureCloudPlatformClientV2.configuration.host = 'https://api.%s' % (os.environ.get('PURECLOUD_ENVIRONMENT'))

		# Base64 encode the client ID and client secret
		id_and_secret = '%s:%s' % (os.environ.get('PURECLOUD_CLIENT_ID'), os.environ.get('PURECLOUD_CLIENT_SECRET'))
		authorization = base64.b64encode(id_and_secret.encode('ascii'))

		# Prepare for POST /oauth/token request
		requestHeaders = {
			'Authorization': ('Basic '.encode() + authorization).decode('utf-8'),
			'Content-Type': 'application/x-www-form-urlencoded'
		}
		requestBody = {
			'grant_type': 'client_credentials'
		}

		# Get token
		response = requests.post('https://login.%s/oauth/token' % (os.environ.get('PURECLOUD_ENVIRONMENT')), data=requestBody, headers=requestHeaders)

		# Check response
		self.assertEqual(response.status_code, 200)

		# Set token on SDK
		responseJson = response.json()
		self.assertIsNotNone(responseJson['access_token'])
		# Clear out old access token to make sure it isn't getting used
		PureCloudPlatformClientV2.configuration.access_token = ""
		client = PureCloudPlatformClientV2.ApiClient()
		# Set the access token on the ApiClient instead of the configuration
		client.access_token = responseJson['access_token']
		SdkTests.users_api = PureCloudPlatformClientV2.UsersApi(client)

	def test_8_get_user_again(self):
		user = SdkTests.users_api.get_user(SdkTests.userId, expand = [ 'profileSkills' ])

		self.assertEqual(user.id, SdkTests.userId)
		self.assertEqual(user.name, SdkTests.userName)
		self.assertEqual(user.email, SdkTests.userEmail)
		self.assertEqual(user.department, SdkTests.userDepartment)
		self.assertEqual(user.profile_skills[0], SdkTests.userProfileSkill)

	def test_9_delete_user(self):
		SdkTests.users_api.delete_user(SdkTests.userId)

	def purecloudregiontest(self,x):
		return{
			'mypurecloud.com': PureCloudPlatformClientV2.PureCloudRegionHosts.us_east_1,
			'mypurecloud.ie': PureCloudPlatformClientV2.PureCloudRegionHosts.eu_west_1,
			'mypurecloud.com.au': PureCloudPlatformClientV2.PureCloudRegionHosts.ap_southeast_2,
			'mypurecloud.jp': PureCloudPlatformClientV2.PureCloudRegionHosts.ap_northeast_1,
			'mypurecloud.de': PureCloudPlatformClientV2.PureCloudRegionHosts.eu_central_1,
			'usw2.pure.cloud': PureCloudPlatformClientV2.PureCloudRegionHosts.us_west_2,
			'cac1.pure.cloud': PureCloudPlatformClientV2.PureCloudRegionHosts.ca_central_1,
			'apne2.pure.cloud': PureCloudPlatformClientV2.PureCloudRegionHosts.ap_northeast_2,
			'euw2.pure.cloud': PureCloudPlatformClientV2.PureCloudRegionHosts.eu_west_2
			}.get(x,x)



if __name__ == '__main__':
	unittest.sortTestMethodsUsing(None)
	unittest.main()
