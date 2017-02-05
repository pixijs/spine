var fs = require('fs');
var path = require('path');
var path = path.resolve(__dirname, '../bin/pixi-spine.d.ts');

fs.readFile(path, 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  var result = data.replace(/namespace pixi_spine/g, 'module PIXI.spine');

  fs.writeFile(path, result, 'utf8', function (err) {
    if (err) return console.log(err);
  });
});
