### How to use pre-loaded json and atlas files

```js
var rawSkeletonData = JSON.parse("$jsondata"); //your skeleton.json file here
var rawAtlasData = "$atlasdata"; //your atlas file 

var spineAtlas = new PIXI.spine.core.TextureAtlas(rawAtlasData, function(line, callback) {
    // pass the image here.
    callback(PIXI.BaseTexture.fromImage(line));
}); // specify path, image.png will be added automatically

var spineAtlasLoader = new PIXI.spine.core.AtlasAttachmentLoader(spineAtlas)
var spineJsonParser = new PIXI.spine.core.SkeletonJson(spineAtlasLoader);
var spineData = spineJsonParser.readSkeletonData(rawSkeletonData);

// now we can create spine instance
var spine = new PIXI.spine.Spine(spineData);
```
