### Changing the texture the direct way (hacks)

#### This example is for PixiJS version < 7.x

```js
//let 'spine' be Spine object
var spine = new PIXI.spine.Spine(loader.resources['spineBoy'].data);
//let myTexture be the texture you are assigning. it can be something from the spritesheet
var myTexture = loader.resources['newRegionTexture'].texture;

spine.hackTextureBySlotName('head', myTexture);

//Region attachments are tricky: they must have width and height, specify it if your texture differs from old one
spine.hackTextureBySlotName('arm', myTexture, { width: 100, height : 100 });
//If you want texture have its natural size, pass it. pixiV3 - texture.frame, pixiV4 - texture.orig
spine.hackTextureBySlotIndex(7, myTexture, texture.orig || texture.frame);
```
