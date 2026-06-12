import fs from 'fs-extra';
import { log } from '../../../../modules/log/logger';

export class PreBuildPostRun {
	public init(): void {
		try {
			log.debug('PreBuildPostRun initialization started');

			let swaggerCodegenConfigFilePath = process.argv[2];
			log.debug(`swaggerCodegenConfigFilePath: ${swaggerCodegenConfigFilePath}`);
			let version = fs.readJsonSync(process.argv[3]);
			let moduleName = process.argv[4];
			let projectName = process.argv[5];
			let enableCustomHeaders: boolean = false;
			if (process.argv[6] && process.argv[6].toLowerCase() === 'true') enableCustomHeaders = true;

			let config = {
				moduleName: moduleName || 'platformClient',
				projectName: projectName || 'purecloud-platform-client-v2',
				projectDescription: 'A JavaScript library to interface with the PureCloud Platform API',
				projectVersion: version.displayFull,
				projectLicenseName: 'MIT',
				usePromises: true,
				useInheritance: false,
				emitModelMethods: true,
				emitJSDoc: true,
				localVariablePrefix: 'pc',
				invokerPackage: projectName || 'purecloud-platform-client-v2',
				enableCustomHeaders: enableCustomHeaders || false
			};

			if (enableCustomHeaders == true) log.debug("Custom Headers Support enabled");

			fs.writeFileSync(swaggerCodegenConfigFilePath, JSON.stringify(config, null, 2));
			log.debug(`Config file written to ${swaggerCodegenConfigFilePath}`);
		} catch (err: unknown) {
			process.exitCode = 1;
			log.error(`PreBuildPostRun exception: ${err}`);
		}
	}
}

// Call the method directly
log.debug('Starting PreBuildPostRun script execution');
const preBuildPostRun = new PreBuildPostRun();
preBuildPostRun.init();
log.debug('PreBuildPostRun script execution completed');
