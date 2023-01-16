### How to choose skeleton scale

#### This example is for PixiJS version < 7.x

```js
var spineLoaderOptions = { metadata: { spineSkeletonScale: 2.0 } };
PIXI.loader
    .add('pixie', '_assets/spine/Pixie.json', spineLoaderOptions)
    .load(onAssetsLoaded);
```
