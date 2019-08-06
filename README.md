# pixi-spine

Spine 3.8 implementation for PixiJS v5.

PixiJS v5 Spine 3.8 - this branch, latest npm

PixiJS v5 Spine 3.7 - [pixi5-spine3.7 branch](https://github.com/pixijs/pixi-spine/tree/pixi5-spine3.7) npm `2.0.5`

PixiJS v4 Spine 3.8 - [v4.x-3.8 branch](https://github.com/pixijs/pixi-spine/tree/v4.x-3.8) , no npm 

PixiJS v4 Spine 3.7 - [v4.x branch](https://github.com/pixijs/pixi-spine/tree/v4.x) npm version `1.5.21` 

## Usage

### Prebuilt Files

If you are just including the built files, pixi spine adds itself to a `PIXI` namespace:

```js
new PIXI.spine.Spine();
```

### Basic example

```js
var app = new PIXI.Application();

document.body.appendChild(app.view);

app.loader
    .add('spineCharacter', 'spine-data-1/HERO.json')
    .load(function (loader, resources) {
        var animation = new PIXI.spine.Spine(resources.spineCharacter.spineData);

        // add the animation to the scene and render...
        app.stage.addChild(animation);
        
        // run 
        var animation = new PIXI.spine.Spine(spineBoyData);
        if (animation.state.hasAnimation('run')) {
            // run forever, little boy!
            animation.state.setAnimation(0, 'run', true);
            // dont run too fast
            animation.state.timeScale = 0.1;
        }
        
        app.start();
    });
```

## Want to go advanced?

Read our [docs](examples/index.md).

## Two-color tint

Light-dark tint is supported with help of [pixi-heaven](https://github.com/gameofbombs/pixi-heaven)

```js
let spine = new PIXI.heaven.Spine(spineData);
```

## WebPack and Angular

Possible webpack way: 

```js
import * as PIXI from "pixi.js';
window.PIXI = PIXI;
import "pixi-spine";
```

Angular:

```ts
import * as PIXI from "pixi.js";
global.PIXI = PIXI;
require("pixi-spine");
```

## Using webpack or browserify?

Our library is tested for integration with webpack and browserify,
check [our travis config](.travis.yml) and [checkpack](http://github.com/cursedcoder/checkpack).

### How to get a wrong result using browserify/webpack

If `resource.spineData` is missing and you consider to use `resource.data` instead, please don't do that and think about middlewares. You probably created `loader` before `pixi-spine` was connected to the project. Consider that you use `app.loader`, here's what to check:

```js
if (app.loader._afterMiddleware.indexOf(PIXI.spine.AtlasParser.use) < 0) {
   app.loader.use(PIXI.spine.AtlasParser.use);
   console.log('Hey, I managed to initialize loader before pixi-spine module!');
}
```

If you see it in the console, then you should consider using `pixi.js` and `pixi-spine` as external dependencies and not pack them inside the build. Or at least create `loader` in the same module you call `add` and `load` functions.


## Typescript

There's "bin/pixi-spine.d.ts" file, you can use it.

## Spine version

We aim to support the latest stable version of spine. 

If you are below Spine 3.5, please please enable "beta updates" and re-export everything from the spine editor.

According to spine runtime license, you can use runtime only if you have bought the editor, so exporting latest versions of animations shouldn't be a problem for you.

## Building

You will need to have [node][node] setup on your machine.

Make sure you have [yarn][yarn] installed:

    npm install -g yarn

Then you can install dependencies and build:

```bash
yarn
yarn build
```

That will output the built distributables to `./bin`.

[node]:             https://nodejs.org/
[typescript]:       https://www.typescriptlang.org/
[yarn]:             https://yarnpkg.com
