### How to change atlas file extension (I hate IIS webserver)

#### This example is for PixiJS version < 7.x

```js
var spineLoaderOptions = { metadata: { spineAtlasSuffix: '.txt' } };
PIXI.loader
    .add('pixie', '_assets/spine/Pixie.json', spineLoaderOptions)
    .load(onAssetsLoaded);
```
