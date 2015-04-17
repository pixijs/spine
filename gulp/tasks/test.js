var path    = require('path'),
    gulp    = require('gulp'),
    mocha   = require('gulp-mocha');

gulp.task('test', function (done) {
    return gulp.src(paths.tests, { read: false })
        .pipe(mocha());
});
