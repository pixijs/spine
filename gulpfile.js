var gulp = require('gulp'),
    concat = require('gulp-concat');
gulp.task('default',function(){
    return gulp.src(['./src/header-SpineRuntime.js','./src/SpineRuntime/*.js'])
            .pipe(concat('SpineRuntime.js'))
            .pipe(gulp.dest('./'));
});

