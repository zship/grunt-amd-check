module.exports = function(grunt) {
	'use strict';

	var path = require('path');
	var Deferred = require('deferreds.js/Deferred');
	var Deferreds = require('deferreds.js/Deferreds');
	var parseDir = './lib/parse';
	var libdir = path.resolve(__dirname + '/lib');
	var util = require('./util.js');
	var _ = grunt.utils._;


	grunt.registerTask('checkrequire', 'Checks for broken AMD dependencies', function() {
		var config = grunt.config.get(this.name);
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

			config.include = util.expand(config.include);
			config.exclude = util.expand(config.exclude);
			var files = _.difference(config.include, config.exclude);

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
					grunt.log.writeln('');
					grunt.log.error();
					grunt.log.writeln('Unresolved dependencies in ' + file + ':');
					deps.forEach(function(dep) {
						grunt.log.writeln('\t' + dep.declared);
					});
				}
			});

			done();

		});

	});


	grunt.registerTask('whatrequires', 'Traces which files depend on given js file', function() {
		var config = grunt.config.get(this.name);
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

			var searchFile = path.resolve(process.cwd() + '/' + config.module);

			grunt.log.writeln('Files depending on ' + searchFile + ':');
			grunt.log.writeln('-----------------------------------------------------------');

			config.include = util.expand(config.include);
			config.exclude = util.expand(config.exclude);
			var pool = _.difference(config.include, config.exclude);

			pool.forEach(function(file) {
				file = path.resolve(process.cwd() + '/' + file);
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

				//console.log(file);
				//console.log(JSON.stringify(deps, false, 4));

				var match = _.intersection(deps, [searchFile]);
				if (match.length) {
					grunt.log.writeln(file);
				}
			});

			done();

		});
	});

};
