const _ = require('lodash');
const spawn = require('child_process').spawn;
const Q = require('q');

const log = require('./logger');



function Git() {

}


Git.prototype.authToken = undefined;


Git.prototype.clone = function(repo, branch, target) {
	var deferred = Q.defer();

	try {
		repo = injectAuthToken(repo, this.authToken);
		var args = [];
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

		spawnProcess(args, undefined, deferred);

	} catch(err) {
		deferred.reject(err);
	}

	return deferred.promise;
};

Git.prototype.saveChanges = function(repo, localDir, message) {
	var deferred = Q.defer();

	try {
		repo = injectAuthToken(repo, this.authToken);
		spawnProcess([ 'add', '-A' ], localDir)
			.then(() => { 
				var commitArgs = [ 'commit', '-m', message ? message : 'automated commit' ];
				return spawnProcess(commitArgs, localDir); 
			})
			.then(() => {
				return spawnProcess([ 'push', `--repo=${repo}` ], localDir);
			})
			.then(() => deferred.resolve())
			.catch((err) => deferred.reject(err));
	} catch(err) {
		deferred.reject(err);
	}

	return deferred.promise;
};





function injectAuthToken(repo, authToken) {
	if (authToken) {
		if (repo.startsWith('git://'))
			repo = `git://${authToken}@${repo.substring(6)}`;
		else if (repo.startsWith('http://'))
			repo = `http://${authToken}@${repo.substring(7)}`;
		else if (repo.startsWith('https://'))
			repo = `https://${authToken}@${repo.substring(8)}`;
		else
			throw new Error("Can't figure out where to put the auth token! URL is not GIT, HTTP, or HTTPS!");
	}
	log.debug(`repo: ${repo}`);
	return repo;
}

function spawnProcess(args, localDir, deferred) {
	// If the caller gives us the deferred, we'll resolve it for them
	if (!deferred)
		deferred = Q.defer();

	try {
		log.debug(`Spawn: git ${args.join(' ')}`);

		var options = { stdio: 'inherit' };
		if (localDir) {
			log.debug(`Using cwd: ${localDir}`);
			options.cwd = localDir;
		}

		var cmd = spawn('git', args, options);
		
		cmd.on('error', (err) => {
			log.error(`Git operation failed: ${err.message}`);
			deferred.reject(err);
		});

		cmd.on('close', (code) => {
			log.info(`Git operation exited with code ${code}`);
			if (code === 0)
				deferred.resolve();
			else
				deferred.reject(new Error(`Git operation exited with code ${code}`));
		});
	} catch(err) {
		deferred.reject(err);
	}

	return deferred.promise;
}

self = module.exports = new Git();