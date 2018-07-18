### How to use same texture from multiple atlases

imageLoader uses existing resource for a texture if you specify namePrefix.

Do not use this approach if all of your textures are named `skeleton.png` :)

```js
var atlasLoaderOption = { metadata: { imageNamePrefix: 'spineAtlas_' } };
PIXI.loader
    .add('spineboy1.json', spineLoaderOptions);
    .add('spineboy2.json', spineLoaderOptions);
```

Assume both spine objects have `spineboy.png` as a texture, it will be stored in `loader.resources['spineAtlas_spineboy.png']`

Since 1.5.17
