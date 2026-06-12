// import archiver from 'archiver';
import { ZipArchive } from "archiver";
import fs from 'fs-extra';
import { log } from '../log/logger';

export class BuilderZip {

	public async zipDir(inputDir: string, outputPath: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			try {
				let output = fs.createWriteStream(outputPath);

				// let archive = new ZipArchive({
				// 	zlib: { level: 9 }, // Sets the compression level.
				// });
				let archive = new ZipArchive();

				output.on('close', function () {
					log.info('archiver has been finalized and the output file descriptor has closed.');
					log.debug(archive.pointer() + ' total bytes');
					resolve("");
				});

				archive.on('error', function (err) {
					log.error(`Zip zipDir archive operation failed with exception: ${err.message}`);
					reject(err);
				});

				archive.pipe(output);
				archive.directory(inputDir, '/');
				archive.finalize();

			} catch (err: unknown) {
				log.error(`Zip zipDir operation failed with exception: ${err instanceof Error ? err.message : String(err)}`);
				reject(err);
			}
		});
	}
}
