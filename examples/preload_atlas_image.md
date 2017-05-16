### How to use generated or preloaded base textures 

```js
var spineLoaderOptions = { metadata: { 
    image: PIXI.BaseTexture.fromImage("something.jpg") 
} };
PIXI.loader
    .add('pixie', '_assets/spine/Pixie.json', spineLoaderOptions)
    .load(onAssetsLoaded);
```

And if there are multiple pages, names should be extracted from skeleton json and put there:

```js
var myGeneratedCanvas = document.createElement("canvas");
myGeneratedCanvas.width = 1024;
myGeneratedCanvas.height = 1024;
var context = myGeneratedCanvas.getContext("2d"); 
context.fillRect(20, 20, 60, 60);

var spineLoaderOptions = { metadata: { 
    images: {
        "page_0": PIXI.BaseTexture.fromImage("something1.jpg"),
        "page_1": PIXI.BaseTexture.fromCanvas(myGeneratedCanvas)
    } 
} };
PIXI.loader
    .add('pixie', '_assets/spine/Pixie.json', spineLoaderOptions)
    .load(onAssetsLoaded);
```
