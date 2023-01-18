### How to use preload atlas text file from spine2D.

#### This example is for PixiJS version < 7.x

* Step 1:
```js
var atlasLoaderOption = { xhrType: "text"};
PIXI.loader
    .add('common_raw_atlas', '_assets/common.atlas', spineLoaderOptions)
```

* Step 2:

```js
var spineLoaderOptions = { metadata: { 
    atlasRawData: 'common_raw_atlas'
} };
PIXI.loader
    .add('pixie', '_assets/spine/Pixie.json', spineLoaderOptions)
```

In case you don't want to do 2 steps. You just want to use custom atlas like this:
```js
var spineLoaderOptions = { metadata: { 
    spineAtlasFile: '_assets/common.atlas'
} };
PIXI.loader
    .add('pixie', '_assets/spine/Pixie.json', spineLoaderOptions)
```
But it will be repeat read atlas text file one more times per json. 
Feel free if you have only a few json.
View more here: https://github.com/pixijs/pixi-spine/issues/224.
