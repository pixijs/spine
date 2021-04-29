# pixi-spine

Spine 3.7, 3.8, 4.0 implementation for PixiJS v5 & v6. 

Typescript definitions are up-to-date with PixiJS v6.

For spine < 3.7 support is limited, but accepting PR's for `runtime-3.7` package.

For previous versions of pixi & typescript definitions - please refer to [README in pixi5](https://github.com/pixijs/pixi-spine/tree/pixi5/#readme)

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

Alternatively, you may use `@pixi-spine/all-3.8` package. 

### Vanilla JS, UMD build

All pixiJS v6 plugins has special `umd` build suited for vanilla.   
Navigate `pixi-spine` npm package, take `dist/pixi-spine.umd.js` file.
Alternatively, you can look in `@pixi-spine/all-3.8` npm package.

```html
<script src='lib/pixi.js'></script>
<script src='lib/pixi-spine.umd.js'></script>
```

```js
const animation = new PIXI.spine.Spine(resources.spineCharacter.spineData);
```

Unfortunately, there are no typescript definitions for vanilla build on both `pixi` v6 and `pixi-spine`

### Custom bundle

Main bundle `pixi-spine` weights more than 1 MB.

Bundle `@pixi-spine/all-3.8` weights about 400 KB.

If you want to use different version (3.7, 4.0) please look how modules `loader-3.8` and `pixi-spine-3.8` are made.

Basically, you have to copy its code in a separate file in your project, and alter imports to corresonding version. 

For example, here's bundle for 3.8:

```js
import {SpineParser} from '@pixi-spine/loader-3.8';
export {SpineParser};
export * from '@pixi-spine/runtime-3.8';
export * from '@pixi-spine/base';

SpineParser.registerLoaderPlugin();
```

In case author was too lazy to publish`loader-3.7` or `loader-4.0`, you can do the same trick with them, just look in sources of `loader-3.8`.

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
