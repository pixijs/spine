### How to use generated or preloaded base textures 

#### This example is for PixiJS version < 7.x

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

In case you want to change something serious, like jpg instead of png, or change texture folder:

```js
function advancedImageLoader(loader, namePrefix, baseUrl, imageOptions) {
    if (baseUrl && baseUrl.lastIndexOf('/') !== (baseUrl.length - 1)) {
        baseUrl += '/';
    }
    return function (line, callback) {
        line = line.replace('.png', '.jpg');
        var name = namePrefix + line;
        var url = baseUrl + line;
        loader.add(name, url, imageOptions, function(resource) {
            //you can load second texture here and do some manipulations if you want ;)
            callback(resource.texture.baseTexture);
        });
    }
}
var spineLoaderOptions = { metadata: { 
    imageLoader: advancedImageLoader
} };
PIXI.loader
    .add('pixie', '_assets/spine/Pixie.json', spineLoaderOptions)
    .load(onAssetsLoaded);
```
