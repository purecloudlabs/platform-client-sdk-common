import childProcess from 'child_process';

const maxFileBufferSize = 1024 * 1024 * 1024;
const maxBinaryBufferSize = 1024 * 1024 * 10;
const maxRetryAttempts = 10;
// Seconds
const defaultRetryWaitTime = 10;

// Donwloading file (txt or binary) from a remote URL (sync function)

function downloadFromUrl(url: string, encoding: 'utf8' | 'binary', maxBuffer: number = maxFileBufferSize, maxRetry: number = maxRetryAttempts, retryWaitTime: number = defaultRetryWaitTime) {
    let i: number = -1;
    while (i < maxRetry) {
        i++;
        console.info(`Downloading file: ${url}`);
        // Source: https://www.npmjs.com/package/download-file-sync
        var file = childProcess.execFileSync('curl', ['--silent', '-L', url], { encoding: encoding, maxBuffer: maxBuffer });
        if ((!file || file === '') && (i < maxRetry)) {
            console.info(`File was empty! sleeping for ${retryWaitTime} seconds. Retries left: ${maxRetry - i}`);
            childProcess.execFileSync('curl', ['--silent', 'https://httpbin.org/delay/10'], { encoding: 'utf8' });
        } else {
            return file;
        }
    }
    console.warn('Failed to get contents for file!');
    return null;
}

export function downloadFile(url: string) {
    return downloadFromUrl(url, 'utf8', maxFileBufferSize);
}

export function downloadBinary(url: string) {
    return downloadFromUrl(url, 'binary', maxBinaryBufferSize);
}

// Fetch version, wait with set timeout

async function sleep(millis: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, millis));
}

export class BuilderHttpError extends Error {
    request: Request;
    response: Response;
    responseText: string;

    constructor(message: string, req: Request, resp: Response, txtData: string) {
        super(message);
        this.name = "BuilderHttpError";
        this.request = req;
        this.response = resp;
        this.responseText = txtData;
    }
}

export async function gcLoginClientCredentialsGrant(env: string, clientId: string, clientSecret: string): Promise<string> {
    try {
        let authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        let reqBody = new URLSearchParams({ grant_type: 'client_credentials'});
        let request = new Request(`https://login.${env}/oauth/token`, {
            method: "POST",
            body: reqBody.toString(),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${authHeader}`
            },
        });
        let response = await fetch(request);
        let responseTxtData = await response.text();
        if (!response.ok) {
            throw new BuilderHttpError('Failed to get ClientCredentials token.', request, response, responseTxtData);
        }
        if (!responseTxtData || !responseTxtData.trim()) {
            // Empty string if response body is empty
            throw new BuilderHttpError('Failed to get ClientCredentials token.', request, response, responseTxtData);
        }
        let authData = JSON.parse(responseTxtData);
        if (authData && authData["access_token"]) {
            return authData["access_token"];
        } else {
            throw new BuilderHttpError('Failed to get ClientCredentials token.', request, response, responseTxtData);
        }
    } catch (err: unknown) {
        throw err;
    }
}

export interface AvailableTopicEntityListing {
    entities: any[]
}

export async function gcGetNotificationsAvailabletopics(env: string, token: string): Promise<AvailableTopicEntityListing> {
    try {
        let request = new Request(`https://api.${env}/api/v2/notifications/availabletopics?expand=schema`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });
        let response = await fetch(request);
        let responseTxtData = await response.text();
        if (!response.ok){
            throw new BuilderHttpError('Failed to get Notifications topics.', request, response, responseTxtData);
        }
        if (!responseTxtData || !responseTxtData.trim()) {
            throw new BuilderHttpError('Failed to get Notifications topics.', request, response, responseTxtData);
        }
        let availableTopicEntityListing: AvailableTopicEntityListing = JSON.parse(responseTxtData);
        if (availableTopicEntityListing && availableTopicEntityListing.entities) {
            return availableTopicEntityListing;
        } else {
            throw new BuilderHttpError('Failed to get Notifications topics.', request, response, responseTxtData);
        }
    } catch (err: unknown) {
        throw err;
    }
}

export async function postGithubApiPromise(url: string, token: string, body: any) {
    try {
        let request = new Request(url, {
            method: "POST",
            body: JSON.stringify(body),
            headers: {
                "Content-Type": "application/json",
                "Authorization": `token ${token}`,
                "User-Agent": "github-api-promise"
            },
        });
        let response = await fetch(request);
        let responseTxtData = await response.text();
        if (!response.ok) {
            throw new BuilderHttpError('Failed to create Github release.', request, response, responseTxtData);
        }
        let gitResponse = JSON.parse(responseTxtData);
        if (gitResponse) {
            return gitResponse;
        } else {
            throw new BuilderHttpError('Failed to create Github release.', request, response, responseTxtData);
        }
    } catch (err: unknown) {
        throw err;
    }
}
