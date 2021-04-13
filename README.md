# pixi-spine

Spine 3.8 implementation for PixiJS v6.

PixiJS v5 and before - please refer to [README in v5.x](https://github.com/pixijs/pixi-spine/tree/v5.x/#readme) 

Demos:

https://pixijs.io/examples/#/plugin-spine/spineboy-pro.js

https://pixijs.io/examples/#/plugin-projection/runner.js

https://sbfkcel.github.io/pixi-spine-debug/

## Basic Usage

Please read this carefully: there are three ways to add this lib to your app.

1. Angular, React, Webpack, Rollup - if you know those words, use ES6 bundles 
2. Good old `<script src="pixi-spine.umd.js">` , also named vanilla JS
3. Custom bundle, for guys who really want to shake da tree

### ES6 bundles

```js
import * as PIXI from 'pixi.js';
import {Spine} from 'pixi-spine';

const app = new PIXI.Application();
document.body.appendChild(app.view);

app.loader
    .add('spineCharacter', 'spine-data-1/HERO.json')
    .load(function (loader, resources) {
        const animation = new Spine(resources.spineCharacter.spineData);

        // add the animation to the scene and render...
        app.stage.addChild(animation);
        
        if (animation.state.hasAnimation('run')) {
            // run forever, little boy!
            animation.state.setAnimation(0, 'run', true);
            // dont run too fast
            animation.state.timeScale = 0.1;
        }
        
        app.start();
    });
```

### Vanilla JS, UMD build

All pixiJS v6 plugins has special `umd` build suited for vanilla.   
Navigate `pixi-spine` npm package, take `dist/pixi-spine.umd.js` file.

```html
<script src='lib/pixi.js'></script>
<script src='lib/pixi-spine.umd.js'></script>
```

```js
const animation = new PIXI.spine.Spine(resources.spineCharacter.spineData);
```

Unfortunately, there are no typescript definitions for vanilla build on both `pixi` v6 and `pixi-spine`

### Custom bundle

The same way you can make your `PIXI` bundle with [pixi-customize](https://pixijs.io/customize/)

Take contents of `pixi-spine` bundle and put it in your local `pixi-spine.js` file

```js
import {SpineParser} from '@pixi-spine/loader-3.8';
export {SpineParser};
export * from '@pixi-spine/runtime-3.8';
export * from '@pixi-spine/base';

SpineParser.registerLoaderPlugin();
```

Now that you re-exported everything, you can use it in the project by importing things from local `pixi-spine.js` file

## Want to go advanced?

Read our [docs](examples/index.md).

### Two-color tint

Light-dark tint is supported with help of [pixi-heaven](https://github.com/gameofbombs/pixi-heaven)
Currently supported only by UMD build.

```js
let spine = new PIXI.heaven.Spine(spineData);
```

### Debug

To show bones and bounds you can use [pixi-spine-debug](https://github.com/sbfkcel/pixi-spine-debug). If you want to write your own debug plugin, look at how this one [was created](https://github.com/pixijs/pixi-spine/issues/324)

Demo: https://sbfkcel.github.io/pixi-spine-debug/

## Build & Development

You will need to have [node][node] setup on your machine.

Make sure you have [rush][rush] installed:

```bash
npm install -g @microsoft/rush
```

Then you can install dependencies and build:

```bash
npm run prepare
npm run build
```

That will output the built all modules. UMD can be found in `./bundles/pixi-spine/dist`.

If you use IntellIJ Idea / Webstorm to navigate the project, take this line and set it in **project settings** / **exclude files**  

```
packages/*/node_modules;packages/*/compile;bundles/*/node_modules;bundles/*/compile;lib;dist
```

[node]:             https://nodejs.org/
[typescript]:       https://www.typescriptlang.org/
[rush]:             https://rushjs.io/
