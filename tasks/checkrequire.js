module.exports = function(grunt) {
	'use strict';

	var path = require('path');
	var parseDir = './lib/parse';
	var libdir = path.resolve(__dirname + '/lib');
	var util = require('./util.js');
	var _ = grunt.utils._;


	grunt.registerTask('checkrequire', 'Checks for broken AMD dependencies', function() {
		var config = grunt.config.get(this.name);
		var done = this.async();


		config.include = util.expand(config.include);
		config.exclude = util.expand(config.exclude);

		var files = _.difference(config.include, config.exclude);

		var requirejs = require(libdir + '/r.js');
		requirejs.config({
			baseUrl: __dirname,
			nodeRequire: require
		});

		requirejs([parseDir], function(parse) {

			var rjsconfig = grunt.config.get('requirejs');

			_.each(files, function(file) {
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

};
