import _ from 'lodash';
import { log } from '../../log/logger.js';
import { Builder } from '../builder.js';
import { executeScripts } from './utils.js';
import { getEnv } from '../../util/utils.js';


export async function postbuildImpl(builder: Builder): Promise<void> {
    try {
        log.debug('Starting postbuild implementation');
        // Pre-run scripts
        log.debug('Executing postbuild pre-run scripts');
        executeScripts(builder, builder.config.stageSettings.postbuild.preRunScripts, 'custom postbuild pre-run');

        log.debug('Creating release');
        await createRelease(builder);

        log.debug('Release created, executing postbuild post-run scripts');
        executeScripts(builder, builder.config.stageSettings.postbuild.postRunScripts, 'custom postbuild post-run');

        log.debug('Postbuild implementation completed successfully');
        return;
    } catch (err: unknown) {
        if (err instanceof Error) {
            log.error(`Postbuild implementation failed: ${err.message}`);
            log.debug(`Stack trace: ${err.stack}`);
        } else {
            log.error(`Postbuild implementation failed: ${err}`);
        }
        throw err;
    }
}

async function createRelease(builder: Builder): Promise<void> {
    try {
        if (!builder.config.settings.sdkRepo.repo || builder.config.settings.sdkRepo.repo === '') {
            log.warn('Skipping github release creation! Repo is undefined.');
            return;
        }
        if (builder.config.stageSettings.postbuild.gitCommit !== true) {
            log.warn('Skipping git commit and github release creation! Set postbuild.gitCommit=true to commit changes.');
            return;
        }

        if (builder.isNewVersion !== true) {
            log.warn('Skipping github release creation! Build did not produce a new version.');
            return;
        }

        await builder.git.saveChanges(builder.config.settings.sdkRepo.repo, getEnv('SDK_REPO') as string, builder.version.displayFull ?? '');

        if (builder.config.stageSettings.postbuild.publishRelease !== true) {
            log.warn('Skipping github release creation! Set postbuild.publishRelease=true to release.');
            return;
        }

        // Expected format: https://github.com/grouporuser/reponame
        let repoParts = builder.config.settings.sdkRepo.repo.split('/');
        let repoName = repoParts[repoParts.length - 1];
        let repoOwner = repoParts[repoParts.length - 2];
        if (repoName.endsWith('.git')) repoName = repoName.substring(0, repoName.length - 4);
        log.log.debug(`repoName: ${repoName}`);
        log.log.debug(`repoOwner: ${repoOwner}`);

        builder.githubConfig.repo = repoName;
        builder.githubConfig.owner = repoOwner;

        const tagName = (builder.config.settings.sdkRepo.tagFormat ?? '').replace('{version}', builder.version.displayFull ?? '');
        let createReleaseOptions = {
            tag_name: tagName,
            target_commitish: builder.config.settings.sdkRepo.branch ? builder.config.settings.sdkRepo.branch : 'master',
            name: tagName,
            body: `Release notes for version ${tagName}\n${builder.releaseNoteSummary}`,
            draft: false,
            prerelease: false,
        };

        console.log(createReleaseOptions);
        // Create release
        let release = await builder.git.githubCreateRelease(builder.githubConfig, createReleaseOptions);
        log.info(`Created release #${release}`);
        return;
    } catch (err: unknown) {
        throw err;
    }
}

