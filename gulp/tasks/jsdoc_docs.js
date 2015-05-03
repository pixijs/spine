var gulp = require('gulp'),
    exec = require('child_process').exec;
gulp.task('jsdoc_docs', function (done) {
    exec('jsdoc -c docs.json', 
        function (err, stdout, stderr) {
            console.log(stdout);
            console.log(stderr);
            done(err);
        }
    );
});

