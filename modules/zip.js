const archiver = require('archiver');
const fs = require('fs-extra');
const Q = require('q');



function Zip() {

}



Zip.prototype.zipDir = function(inputDir, outputPath) {
	var deferred = Q.defer();

	var output = fs.createWriteStream(outputPath);
	var archive = archiver('zip');

	output.on('close', function () {
	    console.log(archive.pointer() + ' total bytes');
	    console.log('archiver has been finalized and the output file descriptor has closed.');
	    deferred.resolve();
	});

	archive.on('error', function(err){
	    deferred.reject(err);
	});

	archive.pipe(output);
	archive.directory(inputDir, '/');
	archive.finalize();

	return deferred.promise;
};


self = module.exports = new Zip();