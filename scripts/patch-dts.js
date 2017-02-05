var fs = require('fs');
var path = require('path');
var dtsPath = path.resolve(__dirname, '../bin/pixi-spine.d.ts');

fs.readFile(dtsPath, 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  var result = data.replace(/namespace pixi_spine/g, 'module PIXI.spine');

  fs.writeFile(dtsPath, result, 'utf8', function (err) {
    if (err) return console.log(err);
  });
});
