import { ZipArchive } from "archiver";
import fs from 'fs';

export async function zipDir(inputDir: string, outputPath: string): Promise < string > {
	return new Promise<string>((resolve, reject) => {
		try {
			let output = fs.createWriteStream(outputPath);

			// let archive = new ZipArchive({
			// 	zlib: { level: 9 }, // Sets the compression level.
			// });
			let archive = new ZipArchive();

			output.on('close', function () {
				console.log(archive.pointer() + ' total bytes');
				console.log('archiver has been finalized and the output file descriptor has closed.');
				resolve("");
			});

			archive.on('error', function (err) {
				console.log(`Zip zipDir archive operation failed with exception: ${err.message}`);
				reject(err);
			});

			archive.pipe(output);
			archive.directory(inputDir, '/');
			archive.finalize();
		} catch (err: unknown) {
			console.log(`Zip zipDir operation failed with exception: ${err instanceof Error ? err.message : String(err)}`);
			reject(err);
		}
	});
}
