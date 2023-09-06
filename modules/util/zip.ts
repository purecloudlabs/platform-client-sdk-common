import archiver from 'archiver';
import fs from 'fs-extra';

export default class Zip {

	public proxy: any;
	public server: any;

	public zipDir(inputDir: string, outputPath: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {

			try {

				var output = fs.createWriteStream(outputPath);
				var archive = archiver('zip');

				output.on('close', function () {
					console.log(archive.pointer() + ' total bytes');
					console.log('archiver has been finalized and the output file descriptor has closed.');
					resolve("");
				});

				archive.on('error', function (err) {
					reject(err);
				});

				archive.pipe(output);
				archive.directory(inputDir, '/');
				archive.finalize();

			} catch (err) {
				reject(err);
			}

		});
	}
}




