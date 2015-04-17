var gutil = require('gulp-util'),
    plumber = require('gulp-plumber');

function errorHandler(err) {
    gutil.log(err.message || err);

    if (err.stack) {
        gutil.log(err.stack);
    }

    // Keep gulp from hanging on this task
    this.emit('end');
}

module.exports = function () {
    return plumber(errorHandler);
};

module.exports.handler = errorHandler;
