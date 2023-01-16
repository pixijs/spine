### How to use pre-loaded json and atlas files

#### This example is for PixiJS version < 7.x

```js
var rawSkeletonData = JSON.parse("$jsondata"); //your skeleton.json file here
var rawAtlasData = "$atlasdata"; //your atlas file 

var spineAtlas = new PIXI.spine.core.TextureAtlas(rawAtlasData, function(line, callback) {
    // pass the image here.
    callback(PIXI.BaseTexture.fromImage(line));
}); // specify path, image.png will be added automatically

var spineAtlasLoader = new PIXI.spine.core.AtlasAttachmentLoader(spineAtlas)
var spineJsonParser = new PIXI.spine.core.SkeletonJson(spineAtlasLoader);

// in case if you want everything scaled up two times
spineJsonParser.scale = 2.0; 

var spineData = spineJsonParser.readSkeletonData(rawSkeletonData);

// now we can create spine instance
var spine = new PIXI.spine.Spine(spineData);
```
