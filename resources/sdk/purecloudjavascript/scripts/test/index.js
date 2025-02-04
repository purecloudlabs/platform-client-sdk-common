/* globals describe it */

const assert = require('assert');
const { HttpsProxyAgent } = require('hpagent');
const fs = require("fs");
const { X509Certificate } = require("@peculiar/x509");
const forge = require("node-forge");
const axios = require("axios");
const path = require("path")

// purecloud-platform-client-v2
const platformClient = require('../../../../../output/purecloudjavascript/build');
const client = platformClient.ApiClient.instance;
client.setReturnExtendedResponses(true);
const usersApi = new platformClient.UsersApi();

const PURECLOUD_CLIENT_ID = process.env.PURECLOUD_CLIENT_ID;
const PURECLOUD_CLIENT_SECRET = process.env.PURECLOUD_CLIENT_SECRET;
let PURECLOUD_ENVIRONMENT = process.env.PURECLOUD_ENVIRONMENT;

let USER_ID;
const USER_EMAIL = `${guid()}@${PURECLOUD_ENVIRONMENT}`;
const USER_NAME = 'JS SDK Tester';
const USER_DEPARTMENT = 'Ministry of Testing';
const USER_PROFILE_SKILL = 'Testmaster';

describe('JS SDK for Node', function () {
	this.timeout(60000); // Ensure we don't timeout before the API returns a timeout (15s)

	it('should trace basic information', () => {
		PURECLOUD_ENVIRONMENT = setEnvironment();
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
		client.setEnvironment(PURECLOUD_ENVIRONMENT);
		client
			.loginClientCredentialsGrant(PURECLOUD_CLIENT_ID, PURECLOUD_CLIENT_SECRET)
			.then(() => done())
			.catch((err) => handleError(err, done));
	});

	it('should create a user', (done) => {
		usersApi
			.postUsers({
				name: USER_NAME,
				email: USER_EMAIL,
				password: guid() + '!@#$1234asdfASDF',
			})
			.then((data) => {
				USER_ID = data.body.id;
				assert.strictEqual(data.body.name, USER_NAME);
				assert.strictEqual(data.body.email, USER_EMAIL);
                console.log(`USER_ID=${USER_ID}`);
				console.log(`correlation ID postUsers ${data.headers['inin-correlation-id']}`)
				console.log(`Version of User ${data.body.version}`)
				done();
			})
			.catch((err) => handleError(err, done));
	});

	it('should update the user', (done) => {
		usersApi
			.patchUser(USER_ID, {
				department: USER_DEPARTMENT,
				version: 1,
			})
			.then((data) => {
				assert.strictEqual(data.body.id, USER_ID);
				assert.strictEqual(data.body.name, USER_NAME);
				assert.strictEqual(data.body.email, USER_EMAIL);
				assert.strictEqual(data.body.email, USER_EMAIL);
				assert.strictEqual(data.body.department, USER_DEPARTMENT);
				done();
			})
			.catch((err) => handleError(err, done));
	});

	it('should set profile skills on the user', (done) => {
		usersApi
			.putUserProfileskills(USER_ID, [USER_PROFILE_SKILL])
			.then((data) => {
				assert.strictEqual(data.body.length, 1);
				assert.strictEqual(data.body[0], USER_PROFILE_SKILL);
				console.log(`correlation ID putUserProfileskills ${data.headers['inin-correlation-id']}`)
				done();
			})
			.catch((err) => handleError(err, done));
	});

	it('should get the user', (done) => {
		getUsers(2, done);
	});

	function getUsers(retry, done) {
		setTimeout(() => {
			usersApi
				.getUser(USER_ID, { expand: ['profileSkills'] })
				.then((data) => {
					try {
						assert.strictEqual(data.body.id, USER_ID);
						assert.strictEqual(data.body.name, USER_NAME);
						assert.strictEqual(data.body.email, USER_EMAIL);
						assert.strictEqual(data.body.department, USER_DEPARTMENT);
						console.log(`correlation ID getUser ${data.headers['inin-correlation-id']}`)
						console.log(`Version of User ${data.body.version}`)
						// Commented out until the issue with APIs to send the latest Version of the User is fixed.
						//assert.strictEqual(data.body.profileSkills[0], USER_PROFILE_SKILL);
						done();
					} catch (err) {
						if (retry > 0) {
							getUsers(--retry, done);
						} else {
							handleError(err, done);
						}
					}
				})
				.catch((err) => handleError(err, done));
		}, 8000);
	}


	it('should get the user through a proxy', (done) => {
		client.setGateway(null);
		httpsAgent = new HttpsProxyAgent({
			proxy: 'http://localhost:4001',
		});
		client.setProxyAgent(httpsAgent)
		usersApi
			.getUser(USER_ID, { expand: ['profileSkills'] })
			.then((data) => {
				assert.strictEqual(data.body.id, USER_ID);
				assert.strictEqual(data.body.name, USER_NAME);
				assert.strictEqual(data.body.email, USER_EMAIL);
				assert.strictEqual(data.body.department, USER_DEPARTMENT);
				done();
			})
			.catch((err) => handleError(err, done));
	});

	it('should get the user with custom client', (done) => {

		client.setGateway({
			host:"localhost",
			port:"4027",
			protocol : "https"
		})
		client.setProxyAgent(null)
		client.setMTLSCertificates('mtls-test/localhost.cert.pem', 'mtls-test/localhost.key.pem', 'mtls-test/ca-chain.cert.pem')
		client.setPreHook(PreHook)
		getUsers(2, done);

	});


	it('should delete the user', (done) => {
		usersApi
			.deleteUser(USER_ID)
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

function PreHook(config) {
	try {
		console.log("Running Pre-Hook: Certificate Revocation Checks");

		// Step 1: Extract certificate from request
		const certificate = getCertificateFromConfig(config);
		const issuerCertificate =  getIssuerCertificate(); // Get issuer CA certificate

		// Step 2: Perform OCSP validation
		const isOCSPValid =  checkOCSP(certificate, issuerCertificate);

		// Step 3: Perform CRL validation
		const crlUrl = getCRLDistributionUrl(certificate); // Extract CRL URL
		const isCRLValid =  checkCRL(certificate, crlUrl);

		// Step 4: Check final result
		if (!isOCSPValid || !isCRLValid) {
			handleError(new Error("Certificate is revoked."))
		}

		console.log("Certificate validated successfully.");
		return config;
	} catch (error) {x
		console.error("Pre-Hook Validation Failed:", error.message);
		return Promise.reject(error); // Reject request if validation fails
	}
}

function getCertificateFromConfig(config) {
	if (!config.httpsAgent || !config.httpsAgent.options) {
		throw new Error("HTTPS agent is required for certificate extraction.");
	}
	const peerCert = config.httpsAgent.options.cert;
	if (!peerCert) {
		throw new Error("No certificate found in HTTPS agent.");
	}

	return forge.pki.certificateFromPem(peerCert);
}


function getIssuerCertificate() {
	try {
		const caCertPath = path.resolve('mtls-test/ca-chain.cert.pem');
		const caCertPem = fs.readFileSync(caCertPath, "utf8");
		return forge.pki.certificateFromPem(caCertPem);
	} catch (error) {
		console.error("Failed to load issuer certificate:", error.message);
		throw new Error("Failed to load CA certificate.");
	}
}

function getCRLDistributionUrl(cert) {
	const extensions = cert.extensions || [];
	for (const ext of extensions) {
		if (ext.name === "cRLDistributionPoints" && ext.value) {
			return ext.value; // URL of the CRL
		}
	}
	console.log("CRL distribution point not found in certificate.");
	return ""
}


function	checkOCSP(cert, issuerCert) {
	try {
		const ocspUrl = extractOCSPUrl(cert);
		if (!ocspUrl) {
			console.warn("OCSP URL not found. Skipping OCSP check.");
			return true; // Assume valid if OCSP is missing
		}

		const ocspRequest = generateOCSPRequest(cert, issuerCert);
		const response =  axios.post(ocspUrl, ocspRequest, { headers: { "Content-Type": "application/ocsp-request" } });

		return parseOCSPResponse(response.data);
	} catch (error) {
		console.error("OCSP check failed:", error.message);
		return false;
	}
}

function extractOCSPUrl(cert) {
	const extensions = cert.extensions || [];
	for (const ext of extensions) {
		if (ext.name === "authorityInfoAccess" && ext.ocsp) {
			return ext.ocsp[0]; // First OCSP responder URL
		}
	}
	return null;
}


function generateOCSPRequest(cert, issuerCert) {
	const request = forge.ocsp.createRequest();
	const serialNumber = cert.serialNumber;

	request.addRequest({
		serialNumber,
		issuerNameHash: forge.md.sha1.create().update(forge.asn1.toDer(forge.pki.certificateToAsn1(issuerCert)).getBytes()).digest().getBytes(),
		issuerKeyHash: forge.md.sha1.create().update(forge.pki.getPublicKey(issuerCert).n.toByteArray()).digest().getBytes(),
	});

	return new Uint8Array(request.toDer());
}

function parseOCSPResponse(responseData) {
	const response = forge.ocsp.parseResponse(responseData);
	return response.certStatus === "good";
}

function checkCRL(cert, crlUrl) {
	try {
		if (crlUrl !== "") {
			const response =  axios.get(crlUrl, { responseType: "arraybuffer" });
			const crlPem = forge.util.encode64(response.data);
			const crl = forge.pki.crlFromPem(crlPem);
			return !crl.revokedCertificate.some((revoked) => revoked.serialNumber === cert.serialNumber);
		}
		else {
			return true
		}
	} catch (error) {
		console.error("CRL check failed:", error.message);
		return false;
	}
}

