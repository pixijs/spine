

### Load json from raw text data (data from spine2D)

Preload text raw data:

```js
let options = {crossOrigin: "", xhrType: "text", metadata: undefined};
    loader.add("atlasId", "atlasFileName", options);
```

Pass raw data as option:

```js
var spineLoaderOptions = { metadata: { atlasRawData: resources[atlasId] } };
PIXI.loader
    .add('pixie', '_assets/spine/Pixie.json', spineLoaderOptions)
    .load(onAssetsLoaded);
```
