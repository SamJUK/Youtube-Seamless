'use strict';

var del = require('del');
var gulp = require('gulp');
var uglify = require('gulp-uglify');

// Clean output directory
gulp.task('clean', () => del(['dist']));

// Gulp task to minify JavaScript files
gulp.task('scripts', function() {
    return gulp.src('./src/mixer.js')
        .pipe(uglify())
        .pipe(gulp.dest('./dist/'))
});

// Gulp task to minify all files
gulp.task('default', ['clean'], function () {
    runSequence('scripts');
});