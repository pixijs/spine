How to make dynamic texture atlas
=================================

#### This example is for PixiJS version < 7.x

If for some reason you don't want to use Spine's `*.atlas` here's how you might customize atlas loading.

```js
  var app = new PIXI.Application();
  document.body.appendChild(app.view);

  var loader = new PIXI.loaders.Loader();

  // before creating an atlas make sure your textures are loaded
  // otherwise it may cause visual issues
  loader.add('color', 'images/color.png')
    .add('background', 'images/background.png');

  loader.load();

  loader.once('complete', function() {
    var atlas = new PIXI.spine.core.TextureAtlas();

    var allTextures = {
      'color': PIXI.Texture.from('color'),
      'background': PIXI.Texture.from('background')
    };
    
    // second parameter is stripExtension=true because we dont need '.png' inside region names
    atlas.addTextureHash(allTextures, true);

    // now load json skeleton
    loader.add('spineCharacter', 'spine_character.json', {metadata: {spineAtlas: atlas}});

    loader.once('complete', function(that, resources) {
      var animation = new PIXI.spine.Spine(resources.spineCharacter.spineData);

      // position it in the center of the canvas
      animation.x = 400;
      animation.y = 300;

      app.stage.addChild(animation);

      if (animation.state.hasAnimation('animation')) {
        // run forever, little boy!
        animation.state.setAnimation(0, 'animation', true);
        // dont run too fast
        animation.state.timeScale = 1;
      }
    });
  });
```
