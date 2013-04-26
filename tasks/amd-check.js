module.exports = function(grunt) {

	'use strict';

	var path = require('path');
	var amd = require('grunt-lib-amd');
	var _ = require('underscore');


	var _getPlugin = function(pluginName, rjsconfig) {
		rjsconfig.nodeRequire = require;
		amd.requirejs.config(rjsconfig);

		var plugin = amd.requirejs(pluginName);

		if (!plugin || !plugin.load) {
			throw '"' + pluginName + '" plugin could not be resolved';
		}

		return plugin;
	};


	var _pluginCanLoad = function(plugin, loadArgs) {
		var didLoad = false;
		var load = function() {
			didLoad = true;
		};
		load.fromText = function() {
			didLoad = true;
		};

		try {
			plugin.load(loadArgs, amd.requirejs, load, {});
		}
		catch(e) {
			return false;
		}

		return didLoad;
	};


	grunt.registerMultiTask('amd-check', 'Checks for broken AMD dependencies', function() {
		var files = this.filesSrc;
		var rjsconfig = amd.loadConfig(grunt.config.get('requirejs'));

		grunt.verbose.writeln('Loaded RequireJS config:');
		grunt.verbose.writeln(JSON.stringify(rjsconfig, false, 4));

		var found = false;

		grunt.log.writeln('Scanning ' + files.length + ' files for unresolved dependencies...');

		files.forEach(function(file) {
			file = path.resolve(process.cwd() + '/' + file);
			var deps =
				amd.getDeps(file)
			.filter(function(depPath) {
				//ignore special 'require' dependency
				return depPath !== 'require';
			})
			.map(function(depPath) {
				if (depPath.search(/!/) !== -1) {
					var rParts = /^(.*)!(.*)$/;
					var parts = depPath.match(rParts);
					var pluginName = parts[1];
					var pluginArgs = parts[2];

					var plugin;
					try {
						plugin = _getPlugin(pluginName, rjsconfig);
					}
					catch(e) {
						return {
							declared: depPath,
							resolved: false,
							message: 'Error on \u001b[4m\u001b[31m' + pluginName + '\u001b[0m!' + pluginArgs + ': "' + pluginName + '" plugin could not be resolved'
						};
					}

					if (!_pluginCanLoad(plugin, pluginArgs)) {
						return {
							declared: depPath,
							resolved: false,
							message: 'Error on ' + pluginName + '!\u001b[4m\u001b[31m' + pluginArgs + '\u001b[0m: "' + pluginName + '" plugin could not load with given arguments'
						};
					}

					return {
						declared: depPath,
						resolved: true
					};
				}

				return {
					declared: depPath,
					resolved: amd.moduleToFileName(depPath, path.dirname(file), rjsconfig)
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
					if (dep.message) {
						grunt.log.writeln('\t\t' + dep.message);
					}
				});
			}
		});

		if (!found) {
			grunt.log.writeln('All dependencies resolved properly!');
		}

	});


	grunt.registerTask('whatrequires', 'Traces which files depend on given js file', function(searchFile) {
		searchFile = path.resolve(searchFile);
		var rjsconfig = amd.loadConfig(grunt.config.get('requirejs'));

		if (!grunt.file.exists(searchFile)) {
			grunt.log.write(searchFile + ' does not exist! ').error();
			return;
		}

		var config = grunt.config.get('amd-check');
		var pool = grunt.task.normalizeMultiTaskFiles(config.files)[0].src;

		grunt.verbose.writeln('Loaded RequireJS config:');
		grunt.verbose.writeln(JSON.stringify(rjsconfig, false, 4));

		var matches = pool.filter(function(file) {
			file = path.resolve(file);

			var deps = _.map(amd.getDeps(file), function(depPath) {
				return amd.moduleToFileName(depPath, path.dirname(file), rjsconfig);
			});

			return deps.some(function(dep) {
				//take case-insensitive filesystems like HFS+ into account
				return dep && dep.toLowerCase() === searchFile.toLowerCase();
			});
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

	});

};
