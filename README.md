grunt-amd-checkrequire
======================

grunt-amd-checkrequire is a [grunt](http://gruntjs.com/) task to check for
broken AMD dependencies in a project.


Installataion
-------------

From the same directory as your Gruntfile, run

```
npm install grunt-amd-checkrequire
```

Then add the following line to your Gruntfile:

```js
grunt.loadNpmTasks('grunt-amd-checkrequire');
```

You can verify that the task is available by running `grunt --help` and
checking that "checkrequire" is under "Available tasks".


Usage
-----

grunt-amd-checkrequire reads two sections of your config: `checkrequire` and
`requirejs`. `checkrequire` can contain these properties (example from
[class.js](https://github.com/zship/class.js)):

```js
checkrequire: {
	//String or Array of files for which to trace dependencies
	include: ['src/**/*.js', 'test/spec/**/*.js']
	//exclude files from the 'include' list. Useful to add specific
	//exceptions to globbing.
	exclude: []
},
```

`requirejs` is a standard [r.js configuration
object](https://github.com/jrburke/r.js/blob/master/build/example.build.js).
grunt-amd-checkrequire uses `basePath`, `paths`, and `packages` (all optional)
to transform AMD module names to absolute file names. If the `mainConfigFile`
property is given, the configuration in that file will be mixed-in to the
`requirejs` property with a **lower** precedence (that is, in the case of a
conflicting configuration property, `requirejs` will always "win" against
`mainConfigFile`).

Once these options are in place, `grunt checkrequire` will run
grunt-amd-checkrequire and report any broken dependencies.
