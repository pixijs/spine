# pixi-spine

Spine implementation for pixi v3

## Usage

### Browserify

If you use browserify you can use pixi-spine like this:

```js
var PIXI = require('pixi.js'),
    spine = require('pixi-spine');

PIXI.loader
    .add('spineCharacter', 'spine-data-1/HERO.json');
    .load(function (loader, resources) {
        var animation = new spine.Spine(resources.spineCharacter.spineData);

        // add the animation to the scene and render...
    });
```

### Prebuilt Files

If you are just including the built files, pixi spine adds itself to a pixi namespace:

```js
PIXI.loader
    .add('spineCharacter', 'spine-data-1/HERO.json');
    .load(function (loader, resources) {
        var animation = new PIXI.spine.Spine(resources.spineCharacter.spineData);

        // add the animation to the scene and render...
    });
```

## Building

You will need to have [node][node] and [gulp][gulp] setup on your machine.

Then you can install dependencies and build:

```js
npm i && npm run build
```

That will output the built distributables to `./dist`.

[node]:       http://nodejs.org/
[gulp]:       http://gulpjs.com/
