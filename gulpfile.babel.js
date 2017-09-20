import gulp from 'gulp';
import { src as src, dest as dst } from 'gulp';
import { log } from 'gulp-util';
import linter from 'gulp-eslint';
import rename from 'gulp-rename';
import uglify from 'gulp-uglify';
import babel from 'gulp-babel'
import concat from 'gulp-concat';
import print from 'gulp-print';
import vinyl_src from 'vinyl-source-stream';
import vinyl_buffer from 'vinyl-buffer';
import browserify from 'browserify';
import babelify from 'babelify';
import watchify from 'watchify';
import mocha from 'gulp-mocha';
import jsdoc from 'gulp-jsdoc3';

const task = (name, deps, fn) => gulp.task(name, deps, fn),
    watch = (files, task) => gulp.watch(files, task);

const
    index = 'lib/index.js',
    cli = 'lib/cli.js',
    test = 'test.js',
    all_js = ['lib/good-turing.js', 'lib/edit.js', 'lib/stats.js', 'lib/cost-functions.js', index, cli, test],
    cli_dist = 'autoalign-cli.js',
    api_dist = 'autoalign.js';

task('lint', _ =>
    src(all_js)
    .pipe(linter(
    {
        rules: {},
        useEslintrc: false,
        envs: ['browser', 'node', 'mocha'],
        extends: 'eslint:recommended',
        baseConfig: { parserOptions: { ecmaVersion: 6, sourceType: 'module' } }
    }))
    .pipe(linter.format('stylish'))
    .pipe(linter.failAfterError()));

const brow_opts = {
    entries: [index],
    transform: [
        ['babelify', { presets: ['es2015'] }]
    ],
    standalone: api_dist.split('.')[0],
    debug: true,
    cache: {},
    packageCache: {},
};

//----DEV-----
task('dev-compile', ['lint'], _ =>
    browserify(brow_opts)
    .plugin(watchify)
    .bundle()
    .on('error', err => log(err.message))
    .on('log', log)
    .pipe(vinyl_src(api_dist))
    .pipe(vinyl_buffer())
    .pipe(dst('.')));

task('dev-compile-cli', ['dev-compile'], _ =>
    src([cli])
    .pipe(babel({ presets: ['es2015'], plugins: [] }))
    .pipe(rename(cli_dist))
    .pipe(dst('.')));

task('dev-test', ['dev-compile'], _ => src([test]).pipe(mocha({ require: 'mocha-clean', timeout: 60000, reporter: 'dot' })));

task('watch', _ => watch(all_js, ['dev-test']));

//----PROD-----

task('compile', ['lint'], _ =>
    browserify(brow_opts)
    .bundle()
    .on('error', err => log(err.message))
    .on('log', log)
    .pipe(vinyl_src(api_dist))
    .pipe(vinyl_buffer())
    .pipe(print())
    .pipe(uglify())
    .pipe(dst('.')));

task('compile-cli', ['compile'], _ =>
    src([cli])
    .pipe(print())
    .pipe(babel({ presets: ['es2015'], plugins: [] }))
    .pipe(rename(cli_dist))
    .pipe(uglify())
    .pipe(dst('.')));

task('test', ['compile-cli'], _ =>
    src([test])
    .pipe(mocha({ require: 'mocha-clean', timeout: 60000 })));


const doc_opts = {
    "tags":
    {
        "allowUnknownTags": true
    },
    "opts":
    {
        "destination": "./docs/",
        "template": "./node_modules/minami"
    },
    "plugins": [
        "plugins/markdown"
    ],

    "sourceType": "module",

    "templates":
    {
        "cleverLinks": false,
        "monospaceLinks": false,
        "navType": "vertical",
        "linenums": true,
        "dateFormat": "MMMM Do YYYY, h:mm:ss a"
    }
};

task('doc', ['test'], _ => src(['lib'], { read: false }).pipe(jsdoc(doc_opts)));
task('just-doc', [], _ => src(['lib'], { read: false }).pipe(jsdoc(doc_opts)));
task('default', ['doc']);