import _ from 'lodash';
import fs from 'fs-extra';
import { spawn, SpawnOptions } from 'child_process';
import { log } from '../log/logger';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { Endpoints } from "@octokit/types";

export class BuilderGit {

	public authToken: string = undefined;

	public async clone(repo: string, branch: string, target: string): Promise<string> {
		log.info(`Starting git clone operation`);
		log.debug(`Clone parameters - repo: ${repo ? '[REDACTED]' : 'undefined'}, branch: ${branch || 'default'}, target: ${target}`);
		try {
			// Skip cloning if no repo was provided
			if (!repo || repo === '') {
				log.info('Repo was undefined. Skipping clone.');
				log.debug(`Creating target directory: ${target}`);
				// Ensure repo dir exists anyway; we still need to build the SDK
				fs.ensureDirSync(target);
				log.debug('Target directory created successfully');
				return '';
			}

			log.debug('Injecting auth token into repository URL');
			repo = this.injectAuthToken(repo, this.authToken);
			let args = [];
			args.push('clone');
			args.push('--quiet');
			args.push('--progress');
			if (branch) {
				log.debug(`Using specific branch: ${branch}`);
				args.push('--branch');
				args.push(branch);
			} else {
				log.debug('Using default branch');
			}
			args.push('--depth');
			args.push('1');
			args.push(repo);
			args.push(target);
			log.debug(`Clone command prepared with ${args.length} arguments`);

			log.info('Executing git clone command');
			await this.spawnProcess(args, undefined);
			log.info(`Git clone completed successfully to ${target}`);
			return 'Cloning successful.';
		} catch (err: unknown) {
			log.error(`Git clone operation failed with exception: ${err instanceof Error ? err.message : String(err)}`);
			throw err;
		}
	}

	public async saveChanges(repo: string, localDir: string, message: string): Promise<void> {
		log.info('Starting git save changes operation');
		log.debug(`Save parameters - repo: ${repo ? '[REDACTED]' : 'undefined'}, localDir: ${localDir}, message: ${message || 'automated commit'}`);
		try {
			// Skip commit if no repo was provided
			if (!repo || repo === '') {
				log.info('Repo was undefined. Skipping commit/push.');
				return;
			}

			log.debug('Injecting auth token for push operation');
			repo = this.injectAuthToken(repo, this.authToken);

			log.info('Starting git add operation');
			await this.spawnProcess(['add', '-A'], localDir);

			log.info('Git add completed, starting commit operation');
			let commitArgs = ['commit', '-m', message ? message : 'automated commit'];
			log.debug(`Commit message: ${message || 'automated commit'}`);
			await this.spawnProcess(commitArgs, localDir);

			log.info('Commit completed, starting push operation');
			await this.spawnProcess(['push', `--repo=${repo}`], localDir);

			log.info('Git save changes completed successfully');
			return;
		} catch (err: unknown) {
			log.error(`Git save changes operation failed with exception: ${err instanceof Error ? err.message : String(err)}`);
			throw err;
		}
	}

	private injectAuthToken(repo: string, authToken?: string): string {
		log.debug('Processing auth token injection');
		if (authToken) {
			log.debug(`Auth token provided, injecting into repository URL`);
			if (repo.startsWith('git://')) {
				log.debug('Detected git:// protocol');
				repo = `git://${authToken}@${repo.substring(6)}`;
			} else if (repo.startsWith('http://')) {
				log.debug('Detected http:// protocol');
				repo = `http://${authToken}@${repo.substring(7)}`;
			} else if (repo.startsWith('https://')) {
				log.debug('Detected https:// protocol');
				repo = `https://${authToken}@${repo.substring(8)}`;
			} else {
				log.error(`Unsupported repository URL format: ${repo}`);
				throw new Error("Can't figure out where to put the auth token! URL is not GIT, HTTP, or HTTPS!");
			}
			log.debug('Auth token injected successfully');
		} else {
			log.debug('No auth token provided, using repository URL as-is');
		}
		log.debug(`repo: ${repo}`);
		return repo;
	}

	private async spawnProcess(args: string[], localDir: string | undefined): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				log.debug(`Spawning git process: git ${args.join(' ')}`);
				let options: SpawnOptions = {
					stdio: 'inherit',
					cwd: undefined,
				};
				if (localDir) {
					log.debug(`Using working directory: ${localDir}`);
					options.cwd = localDir;
				} else {
					log.debug('Using current working directory');
				}
				log.debug('Starting git process');
				let cmd = spawn('git', args, options);
				cmd.on('error', (err) => {
					log.error(`Git process error: ${err.message}`);
					log.debug(`Failed command: git ${args.join(' ')}`);
					reject(err);
				});
				cmd.on('close', (code) => {
					log.debug(`Git process closed with exit code: ${code}`);
					if (code === 0) {
						log.debug(`Git command successful: git ${args.join(' ')}`);
						resolve();
					} else {
						log.error(`Git command failed with exit code ${code}: git ${args.join(' ')}`);
						reject(new Error(`Git operation exited with code ${code}`));
					}
				});
			} catch (err: unknown) {
				log.error(`Failed to spawn git process: ${err instanceof Error ? err.message : String(err)}`);
				reject(err);
			}
		});
	}
}

// Alternative to github-api-promise until update

export interface BuilderGithubConfig {
	owner: string;
	repo: string;
	token: string;
	host: string;
	debug: boolean;
}

function githubGetRepoUrl(githubConfig: BuilderGithubConfig, additionalPath: string): string {
	let url = githubConfig.host + "/repos/" + githubConfig.owner + "/" + githubConfig.repo + "/";
	if (additionalPath) url += additionalPath;
	return url;
}

function githubLogRequestSuccess(githubConfig: BuilderGithubConfig, res: AxiosResponse, message?: string): void {
	if (githubConfig.debug != true) {
		return;
	}
	let logMsg: string = "[INFO]" +
		"[" +
		res.status +
		"]" +
		"[" +
		res.request ? res.request.method : "Unknown Method" +
			" " +
			res.request ? res.request.path : "Unknown Path" +
			"] " +
	(message ? message : "");

	log.info(logMsg);
}

function githubLogRequestError(githubConfig: BuilderGithubConfig, err: AxiosError): void {
	if (axios.isAxiosError(err)) {
		let logMsg: string = "[ERROR]" +
			"[" +
			(err.response ? err.response.status : "Unknown Status Code") +
			"]" +
			"[" +
			(err.request ? err.request.method : "Unknown Method") +
			" " +
			(err.request ? err.request.path : "Unknown Path") +
			"] " +
			(err.message ? err.message : "Unknown Error Message");
		log.error(logMsg);
	} else {
		log.error("[ERROR] Unknown Error");
	}
}

/**
 * Users with push access to the repository can create a release. Returns 422 if anything is wrong with the values in the body.
 * @param  {String} githubConfig 	Github config
 * @param  {JSON} 	body  			A JSON document to send with the request
 * @return {JSON}           		The release data
 */
export async function githubCreateRelease(githubConfig: BuilderGithubConfig, body: any): Promise<Endpoints["POST /repos/{owner}/{repo}/releases"]["response"]["data"]> {
	try {
		let gitPostResponse = await
			axios
				.post(githubGetRepoUrl(githubConfig, "releases"), body, {
					headers: {
						Authorization: `token ${githubConfig.token}`,
						"User-Agent": "github-api-promise",
						"Content-Type": "application/json",
					},
				});

		githubLogRequestSuccess(githubConfig, gitPostResponse);
		return gitPostResponse.data;
	} catch (err: unknown) {
		if (axios.isAxiosError(err)) {
			githubLogRequestError(githubConfig, err);
		} else if (err instanceof Error) {
			log.error(err.message);
		} else {
			log.error(String(err));
		}
		let gitReleaseError = err instanceof Error ? err : new Error(String(err));
		throw gitReleaseError;
	}
}
