/* globals describe it */

const assert = require('assert');

// purecloud-platform-client-v2
const platformClient = require('../../../../../output/purecloudjavascript/build');
const client = platformClient.ApiClient.instance;
const usersApi = new platformClient.UsersApi();

const PURECLOUD_CLIENT_ID = process.env.PURECLOUD_CLIENT_ID;
const PURECLOUD_CLIENT_SECRET = process.env.PURECLOUD_CLIENT_SECRET;
const PURECLOUD_ENVIRONMENT = process.env.PURECLOUD_ENVIRONMENT;

let USER_ID;
const USER_EMAIL = `${guid()}@${PURECLOUD_ENVIRONMENT}`;
const USER_NAME = 'JS SDK Tester';
const USER_DEPARTMENT = 'Ministry of Testing';
const USER_PROFILE_SKILL = 'Testmaster';

describe('JS SDK for Node', function() {
	this.timeout(16000); // Ensure we don't timeout before the API returns a timeout (15s)

	it ('should trace basic information', () => {
		console.log(`PURECLOUD_ENVIRONMENT=${PURECLOUD_ENVIRONMENT}`);
		console.log(`PURECLOUD_CLIENT_ID=${PURECLOUD_CLIENT_ID}`);
		console.log(`USER_EMAIL=${USER_EMAIL}`);
	});

	it('should have client credentials', (done) => {
		assert.notStrictEqual(PURECLOUD_ENVIRONMENT, '', 'PURECLOUD_ENVIRONMENT not set');
		assert.notStrictEqual(PURECLOUD_ENVIRONMENT, undefined, 'PURECLOUD_ENVIRONMENT not set');
		assert.notStrictEqual(PURECLOUD_CLIENT_ID, '', 'PURECLOUD_CLIENT_ID not set');
		assert.notStrictEqual(PURECLOUD_CLIENT_ID, undefined, 'PURECLOUD_CLIENT_ID not set');
		assert.notStrictEqual(PURECLOUD_CLIENT_SECRET, '', 'PURECLOUD_CLIENT_SECRET not set');
		assert.notStrictEqual(PURECLOUD_CLIENT_SECRET, undefined, 'PURECLOUD_CLIENT_SECRET not set');
		done();
	});

	it('should successfully authenticate', (done) => {
		console.log(`Authenticating with ${PURECLOUD_ENVIRONMENT} using client ID ${PURECLOUD_CLIENT_ID}`);
		client.setEnvironment(PURECLOUD_ENVIRONMENT);
		client.loginClientCredentialsGrant(PURECLOUD_CLIENT_ID, PURECLOUD_CLIENT_SECRET)
			.then(() => done())
			.catch((err) => handleError(err, done));
	});

	it('should create a user', (done) => {
		usersApi.postUsers({
			name: USER_NAME,
			email: USER_EMAIL,
			password: guid() + '!@#$1234asdfASDF'
		})
			.then((data) => {
				USER_ID = data.id;
				assert.strictEqual(data.name, USER_NAME);
				assert.strictEqual(data.email, USER_EMAIL);

				console.log(`Created user with ID ${USER_ID}`);

				done();
			})
			.catch((err) => handleError(err, done));
	});

	it('should update the user', (done) => {
		usersApi.patchUser(USER_ID, {
			department: USER_DEPARTMENT,
			version: 1
		})
			.then((data) => {
				assert.strictEqual(data.id, USER_ID);
				assert.strictEqual(data.name, USER_NAME);
				assert.strictEqual(data.email, USER_EMAIL);
				assert.strictEqual(data.email, USER_EMAIL);
				assert.strictEqual(data.department, USER_DEPARTMENT);
				done();
			})
			.catch((err) => handleError(err, done));
	});

	it('should set profile skills on the user', (done) => {
		usersApi.putUserProfileskills(USER_ID, {
			body: [ USER_PROFILE_SKILL ]
		})
		// API-3533 will change ^^^ to vvv
		//usersApi.putUserProfileskills(USER_ID, [ USER_PROFILE_SKILL ])
			.then((data) => {
				assert.strictEqual(data.length, 1);
				assert.strictEqual(data[0], USER_PROFILE_SKILL);
				done();
			})
			.catch((err) => handleError(err, done));
	});

	it('should get the user', (done) => {
		usersApi.getUser(USER_ID, { expand: ['profileSkills'] })
			.then((data) => {
				assert.strictEqual(data.id, USER_ID);
				assert.strictEqual(data.name, USER_NAME);
				assert.strictEqual(data.email, USER_EMAIL);
				assert.strictEqual(data.department, USER_DEPARTMENT);
				assert.strictEqual(data.profileSkills[0], USER_PROFILE_SKILL);
				done();
			})
			.catch((err) => handleError(err, done));
	});

	it('should delete the user', (done) => {
		usersApi.deleteUser(USER_ID)
			.then(() => done())
			.catch((err) => handleError(err, done));
	});
});


function handleError(err, done) {
	console.log(err);
	if (err.headers && err.headers['inin-correlation-id']) {
		if (err.error && err.error.message) {
			err.error.message += ` [${err.headers['inin-correlation-id']}]`;
		} else {
			console.log(`Found correlation ID ${err.headers['inin-correlation-id']}, but was unable to append to the error message.`);
		}
	}

	if (done) done(err.error ? err.error : err);
}

// https://stackoverflow.com/a/105074/1124338
function guid() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	}
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
