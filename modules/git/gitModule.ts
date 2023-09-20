import _ from 'lodash';
import fs from 'fs-extra';
import { spawn, SpawnOptions } from 'child_process';
import Q from 'q';
import Logger from '../log/logger';

const log = new Logger();

export default class Git {

	public authToken: string = undefined;

	private defaultWidth: number = 0;

	clone(repo: string, branch: string, target: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			try {
				// Skip cloning if no repo was provided
				if (!repo || repo === '') {
					log.info('Repo was undefined. Skipping clone.');
					// Ensure repo dir exists anyway; we still need to build the SDK
					fs.ensureDirSync(target);
					resolve('');
					return;
				}

				repo = this.injectAuthToken(repo, this.authToken);
				let args = [];
				args.push('clone');
				args.push('--quiet');
				args.push('--progress');
				if (branch) {
					args.push('--branch');
					args.push(branch);
				}
				args.push('--depth');
				args.push('1');
				args.push(repo);
				args.push(target);



				this.spawnProcess(args, undefined)
					.then(() => {
						resolve('Cloning successful.');
					})
					.catch((err) => {
						reject(err);
					});
			} catch (err) {
				reject(err);
			}
		});
	}

	saveChanges(repo: string, localDir: string, message: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {

			try {
				// Skip commit if no repo was provided
				if (!repo || repo === '') {
					log.info('Repo was undefined. Skipping commit/push.');
					resolve("");
				}

				repo = this.injectAuthToken(repo, this.authToken);
				this.spawnProcess(['add', '-A'], localDir)
					.then(() => {
						let commitArgs = ['commit', '-m', message ? message : 'automated commit'];
						return this.spawnProcess(commitArgs, localDir);
					})
					.then(() => {
						return this.spawnProcess(['push', `--repo=${repo}`], localDir);
					})
					.then(() => resolve(""))
					.catch((err) => reject(err));
			} catch (err) {
				reject(err);
			}
		});
	}


	injectAuthToken(repo, authToken) {
		if (authToken) {
			if (repo.startsWith('git://')) repo = `git://${authToken}@${repo.substring(6)}`;
			else if (repo.startsWith('http://')) repo = `http://${authToken}@${repo.substring(7)}`;
			else if (repo.startsWith('https://')) repo = `https://${authToken}@${repo.substring(8)}`;
			else throw new Error("Can't figure out where to put the auth token! URL is not GIT, HTTP, or HTTPS!");
		}
		log.debug(`repo: ${repo}`);
		return repo;
	}

	private spawnProcess(args: string[], localDir: string | undefined): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				log.debug(`Spawn: git ${args.join(' ')}`);
				let options: SpawnOptions = {
					stdio: 'inherit',
					cwd: undefined,
				};
				if (localDir) {
					log.debug(`Using cwd: ${localDir}`);
					options.cwd = localDir;
				}
				let cmd = spawn('git', args, options);
				cmd.on('error', (err) => {
					log.error(`Git operation failed: ${err.message}`);
					reject(err);
				});
				cmd.on('close', (code) => {
					log.info(`Git operation exited with code ${code}`);
					if (code === 0) resolve();
					else reject(new Error(`Git operation exited with code ${code}`));
				});
			} catch (err) {
				reject(err);
			}
		});
	}
}