### Loading same atlas multiple times

This hack for pixi-v4 swaps image to existing one if loader decides to load something from same url.

Thanks to @Puuca

```js
(function() {
    var utils = PIXI.utils;
    var BaseTexture = PIXI.BaseTexture;
    var Texture = PIXI.Texture;
    PIXI.Texture.fromLoader = function fromLoader(source, imageUrl, name){
        if(!name)
            name = imageUrl;
    
        var texture = utils.TextureCache[name] || utils.TextureCache[imageUrl];
        if(!texture){
            var baseTexture = utils.BaseTextureCache[name] || utils.BaseTextureCache[imageUrl];
            if(!baseTexture){
                //create baseTexture
                baseTexture = new BaseTexture(source, undefined, getResolutionOfUrl(imageUrl));
                //add baseTexture to cache by name
                BaseTexture.addToCache(texture.baseTexture, name);
                // also add references by url if they are different.
                if (name !== imageUrl) BaseTexture.addToCache(texture.baseTexture, imageUrl);
            }
            //create texture
            texture = new Texture(baseTexture);
            //add texture to cache by name
            Texture.addToCache(texture, name);
            // also add references by url if they are different.
            if (name !== imageUrl) Texture.addToCache(texture, imageUrl);
        }
        //return texture
        return texture;
    }
})();
```
