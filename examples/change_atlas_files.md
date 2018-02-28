### How to change atlas file (optimize request and file size by combine many atlas file)

```js
var spineLoaderOptions = { metadata: { spineAtlasFile: filename } };
PIXI.loader
    .add('pixie', '_assets/spine/Pixie.json', spineLoaderOptions)
    .load(onAssetsLoaded);
```
