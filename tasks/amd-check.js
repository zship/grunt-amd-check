module.exports = function(grunt) {
	'use strict';

	var path = require('path');
	var Deferred = require('deferreds').Deferred;
	var Deferreds = require('deferreds');
	var parseDir = './lib/parse';
	var libdir = path.resolve(__dirname + '/lib');
	var util = require('./util.js');
	var _ = require('underscore');


	grunt.registerMultiTask('amd-check', 'Checks for broken AMD dependencies', function() {
		var files = this.filesSrc;
		var done = this.async();

		var requirejs = require(libdir + '/r.js');
		requirejs.config({
			baseUrl: __dirname,
			nodeRequire: require
		});

		Deferreds.parallel(
			util.loadConfig(grunt.config.get('requirejs')),
			function() {
				var deferred = new Deferred();
				requirejs([parseDir], function(parse) {
					deferred.resolve(parse);
				});
				return deferred.promise();
			}
		).then(function(rjsconfig, parse) {

			var found = false;

			grunt.log.writeln('Scanning ' + files.length + ' files for unresolved dependencies...');

			files.forEach(function(file) {
				file = path.resolve(process.cwd() + '/' + file);
				var deps;
				try {
					deps = parse.findDependencies(file, grunt.file.read(file));
				}
				catch(e) {
					deps = [];
				}

				deps = deps
					.filter(function(depPath) {
						//ignore special 'require' dependency
						return depPath !== 'require';
					})
					.map(function(depPath) {
						return {
							declared: depPath,
							resolved: util.moduleToFileName(depPath, path.dirname(file), rjsconfig)
						};
					})
					.filter(function(dep) {
						return !dep.resolved;
					});

				if (deps.length) {
					found = true;
					grunt.log.writeln('');
					grunt.log.error();
					grunt.log.writeln('Unresolved dependencies in ' + file + ':');
					deps.forEach(function(dep) {
						grunt.log.writeln('\t' + dep.declared);
					});
				}
			});

			if (!found) {
				grunt.log.writeln('All dependencies resolved properly!');
			}

			done();

		});

	});


	grunt.registerTask('whatrequires', 'Traces which files depend on given js file', function(searchFile) {
		searchFile = path.resolve(searchFile);

		if (!grunt.file.exists(searchFile)) {
			grunt.log.write(searchFile + ' does not exist! ').error();
			return;
		}

		var config = grunt.config.get('amd-check');
		var pool = grunt.task.normalizeMultiTaskFiles(config.files)[0].src;

		var done = this.async();

		var requirejs = require(libdir + '/r.js');
		requirejs.config({
			baseUrl: __dirname,
			nodeRequire: require
		});

		Deferreds.parallel(
			util.loadConfig(grunt.config.get('requirejs')),
			function() {
				var deferred = new Deferred();
				requirejs([parseDir], function(parse) {
					deferred.resolve(parse);
				});
				return deferred.promise();
			}
		).then(function(rjsconfig, parse) {
			var matches = pool.filter(function(file) {
				file = path.resolve(file);

				var deps;
				try {
					deps = parse.findDependencies(file, grunt.file.read(file));
				}
				catch(e) {
					deps = [];
				}

				deps = _.map(deps, function(depPath) {
					return util.moduleToFileName(depPath, path.dirname(file), rjsconfig);
				});

				var match = _.intersection(deps, [searchFile]);
				if (match.length) {
					return true;
				}
				return false;
			});

			switch (matches.length) {
				case 0:
					grunt.log.write('No files depend');
					break;
				case 1:
					grunt.log.write('1 file depends');
					break;
				default:
					grunt.log.write(matches.length + ' files depend');
					break;
			}

			grunt.log.write(' on ' + searchFile);

			if (!matches.length) {
				grunt.log.write('.\n');
			}
			else {
				grunt.log.write(':\n');
				grunt.log.writeln('-----------------------------------------------------------');
				matches.forEach(function(file) {
					grunt.log.writeln(file);
				});
			}

			done();

		});
	});

};
