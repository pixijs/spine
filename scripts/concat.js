var concat = require('concat-files');
var glob = require('glob');
var path = require('path');

var sourcePath = path.resolve(__dirname, '../src');
var compilationPath = path.resolve(__dirname, '../compilation.ts');

concat(glob.sync(sourcePath + '/**/*.ts'), compilationPath, function(err) {
  if (err) throw err;
  console.log('done');
});
