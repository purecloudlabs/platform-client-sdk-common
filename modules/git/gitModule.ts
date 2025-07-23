import _ from 'lodash';
import fs from 'fs-extra';
import { spawn, SpawnOptions } from 'child_process';
import log from '../log/logger';


export default class Git {

	public authToken: string = undefined;

	private defaultWidth: number = 0;

	clone(repo: string, branch: string, target: string): Promise<string> {
		log.info(`Starting git clone operation`);
		log.debug(`Clone parameters - repo: ${repo ? '[REDACTED]' : 'undefined'}, branch: ${branch || 'default'}, target: ${target}`);
		return new Promise<string>((resolve, reject) => {
			try {
				// Skip cloning if no repo was provided
				if (!repo || repo === '') {
					log.info('Repo was undefined. Skipping clone.');
					log.debug(`Creating target directory: ${target}`);
					// Ensure repo dir exists anyway; we still need to build the SDK
					fs.ensureDirSync(target);
					log.debug('Target directory created successfully');
					resolve('');
					return;
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
				this.spawnProcess(args, undefined)
					.then(() => {
						log.info(`Git clone completed successfully to ${target}`);
						resolve('Cloning successful.');
					})
					.catch((err) => {
						log.error(`Git clone failed: ${err.message}`);
						reject(err);
					});
			} catch (err) {
				log.error(`Git clone operation failed with exception: ${err.message}`);
				reject(err);
			}
		});
	}

	saveChanges(repo: string, localDir: string, message: string): Promise<string> {
		log.info('Starting git save changes operation');
		log.debug(`Save parameters - repo: ${repo ? '[REDACTED]' : 'undefined'}, localDir: ${localDir}, message: ${message || 'automated commit'}`);
		return new Promise<string>((resolve, reject) => {

			try {
				// Skip commit if no repo was provided
				if (!repo || repo === '') {
					log.info('Repo was undefined. Skipping commit/push.');
					resolve("");
					return;
				}

				log.debug('Injecting auth token for push operation');
				repo = this.injectAuthToken(repo, this.authToken);
				log.info('Starting git add operation');
				this.spawnProcess(['add', '-A'], localDir)
					.then(() => {
						log.info('Git add completed, starting commit operation');
						let commitArgs = ['commit', '-m', message ? message : 'automated commit'];
						log.debug(`Commit message: ${message || 'automated commit'}`);
						return this.spawnProcess(commitArgs, localDir);
					})
					.then(() => {
						log.info('Commit completed, starting push operation');
						return this.spawnProcess(['push', `--repo=${repo}`], localDir);
					})
					.then(() => {
						log.info('Git save changes completed successfully');
						resolve("");
					})
					.catch((err) => {
						log.error(`Git save changes failed: ${err.message}`);
						reject(err);
					});
			} catch (err) {
				log.error(`Git save changes operation failed with exception: ${err.message}`);
				reject(err);
			}
		});
	}


	injectAuthToken(repo, authToken) {
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

	private spawnProcess(args: string[], localDir: string | undefined): Promise<void> {
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
			} catch (err) {
				log.error(`Failed to spawn git process: ${err.message}`);
				reject(err);
			}
		});
	}
}