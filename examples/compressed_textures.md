### How to use compressed textures

#### This example is for PixiJS version < 7.x

```js
PIXI.loader.before(PIXI.compressedTextures.extensionChooser(["@2x.atlas", ".dds"]));
var options = { metadata: { spineMetadata: { choice: ["@.5x.atlas", "@2x.atlas"] }, imageMetadata: { choice: [".dds", ".pvr"] } } };

PIXI.loader
    .add('spineCharacter', 'spine-data-1/HERO.json', options)
    .load(function (loader, resources) {
        var animation = new PIXI.spine.Spine(resources.spineCharacter.spineData);
    });
```
