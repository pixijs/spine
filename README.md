# pixi-spine

Spine implementation for pixi v3

## Usage

### Browserify

If you use browserify you can use pixi-spine like this:

```js
var PIXI = require('pixi.js'),
    spine = require('pixi-spine');

PIXI.loader
    .add('spineCharacter', 'spine-data-1/HERO.json');
    .load(function (loader, resources) {
        var animation = new spine.Spine(resources.spineCharacter.spineData);

        // add the animation to the scene and render...
    });
```

### Prebuilt Files

If you are just including the built files, pixi spine adds itself to a pixi namespace:

```js
PIXI.loader
    .add('spineCharacter', 'spine-data-1/HERO.json');
    .load(function (loader, resources) {
        var animation = new PIXI.spine.Spine(resources.spineCharacter.spineData);

        // add the animation to the scene and render...
    });
```

### How to use spine events

```js
// animation is the instantiated pixi-spine object

animation.state.onEvent = function(i, event) {
  console.log('event fired!', i, event);
};
```

### How to choose resolution

Use with [pixi-compressed-textures.js](https://github.com/pixijs/pixi-compressed-textures)

```js
//choose preferred resolution and texture type
PIXI.loader.before(PIXI.compressedTextures.extensionChooser(["@2x.atlas"]));
//specify what resolutions are available for spine animations
var options = { metadata: { spineMetadata: { choice: ["@.5x.atlas", "@2x.atlas"] } } };

PIXI.loader
    .add('spineCharacter', 'spine-data-1/HERO.json', options);
    .load(function (loader, resources) {
        var animation = new PIXI.spine.Spine(resources.spineCharacter.spineData);
    });
```

### How to use pre-loaded json and atlas files

```js
var rawSkeletonData = JSON.parse("$jsondata"); //your skeleton.json file here
var rawAtlasData = "$atlasdata"; //your atlas file 

var spineAtlas = new spine.Atlas(rawAtlasData, function(line, callback) {
        //pass the image here.
        callback(PIXI.BaseTexture.fromImage(line));
    }); //specify path, image.png will be added automatically

var spineJsonParser = new PIXI.spine.SkeletonJsonParser(new PIXI.spine.AtlasAttachmentParser(spineAtlas));
var skeletonData = spineJsonParser.readSkeletonData(rawSkeletonData);

//now we can create spine instance
var spine = new PIXI.spine(skeletonData);
```

### How to use pixi spritesheet with it
It's possible to load each image separately as opposed to loading in just one spritesheet. This can be useful if SVGs are needed instead of providing many PNG files. Simply create an Atlas object and pass in an object of image names and PIXI textures, like so:
```js
var spine = PIXI.spine;
var loader = new PIXI.loaders.Loader();
var atlas = new spine.SpineRuntime.Atlas();
/**
 * Example below shows the textures hardcoded below, but it's also possible to load in a JSON 
 * file with these values using:
 * loader.add('spritesheet', 'myspritesheet.json', callback);
 */
var allTextures = {
  'head': PIXI.Texture.fromImage('head.svg'),
  'left-eye': PIXI.Texture.fromImage('left-eye.svg')
};
//second parameter is stripExtension=true because we dont need '.png' inside region names 
atlas.addTextureHash(allTextures, true);

PIXI.loader
    .add('spineboy', 'spineboy.json', {metadata: {spineAtlas: atlas}})
    .load(function(response) {
      var mySpineBoy = new PIXI.spine.Spine(response.resources.boy.spineData);
      stage.addChild(mySpineBoy);
    });
```
 
### How to change atlas file extension (I hate IIS webserver)

```js
var spineLoaderOptions = { metadata: { spineAtlasSuffix: '.txt' } };
PIXI.loader
    .add('pixie', '_assets/spine/Pixie.json', spineLoaderOptions)
    .load(onAssetsLoaded);
```

### How to run animation

```js
var spineBoy = new PIXI.spine.Spine(spineBoyData);
if (spineBoy.state.hasAnimationByName('run')) {
    //run forever, little boy!
    spineBoy.state.setAnimationByName(0, 'run', true);
    //dont run too fast
    spineBoy.state.timeScale = 0.1;
}
```
 
### Changing Skins
Once skins are defined in Spine, it's possible to change them in runtime. According to the Spine libraries:
>If skin is already set, new skin can change only slots attached in old skin.

So if a skin has been set and another skin is to be set, it may result in the newer skin not showing. To workaround this issue, set the skin to null and then set the skin like so:

```js
var spineCharacter = new PIXI.spine.Spine(resources.boy.spineData);
var skeleton = spineCharacter.skeleton;
 
function setSkinByName(skinName) {
  skeleton.setSkin(null);
  skeleton.setSkinByName('darker');
}

setSkinByName('lighter');

```
If the skin is changed whilst the spineCharacter is animating, there may be a problem with the draw order of some assets. This will resolve when the animation finishes it's loop or the animation is restarted.

### Changing texture the pixi way

```js
//let 'spine' be Spine object
var spine = new PIXI.spine.Spine(loader.resources['spineBoy'].data);
//let myTexture be the texture you are assigning. it can be something from the spritesheet
var myTexture = loader.resources['newRegionTexture'].texture;

spine.hackTextureBySlotName('head', myTexture);

//Region attachments are tricky: they must have width and height, specify it if your texture differs from old one
spine.hackTextureBySlotName('arm', myTexture, { width: 100, height : 100 });
//If you want texture have its natural size, pass it. pixiV3 - texture.frame, pixiV4 - texture.orig
spine.hackTextureBySlotIndex(7, myTexture, texture.orig || texture.frame);
```


### How to use compressed textures

```js
PIXI.loader.before(PIXI.compressedTextures.extensionChooser(["@2x.atlas", ".dds"]));
var options = { metadata: { spineMetadata: { choice: ["@.5x.atlas", "@2x.atlas"] }, imageMetadata: { choice: [".dds", ".pvr"] } } };

PIXI.loader
    .add('spineCharacter', 'spine-data-1/HERO.json', options);
    .load(function (loader, resources) {
        var animation = new PIXI.spine.Spine(resources.spineCharacter.spineData);
    });
```

## Building

You will need to have [node][node] and [gulp][gulp] setup on your machine.

Then you can install dependencies and build:

```js
npm i && npm run build
```

That will output the built distributables to `./dist`.

[node]:       http://nodejs.org/
[gulp]:       http://gulpjs.com/

## Typescript

Typescript definition file for pixi-spine is available in [pixi-typescript](https://github.com/pixijs/pixi-typescript)
