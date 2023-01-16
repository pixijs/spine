Suppose you want to use same atlas for several models. You can put all the textures into same skeleton and export it.

Load it in separate loader, then use atlas for all others.

#### This example is for PixiJS version < 7.x

```js
const preLoader = new PIXI.Loader();
const loader = new PIXI.Loader();


preLoader.add('mainSpine', 'img/main.json');

preLoader.load(() => {
  const options = {
      metadata: {
          spineAtlas: preLoader.resources.mainSpine.spineAtlas
      }
  };

  loader.add('hello', 'img/Cherry.json', options);
  loader.add('hello2', 'img/Bell.json', options);

  loader.load(onAssetsLoaded)
});

function onAssetsLoaded() {
//...
}
```

For more complete solution please wait when someone rewrites spine loader.

If you want to load atlas separately, like `loader.add('myAtlas.atlas'')`, sorry, it is not supported yet.
