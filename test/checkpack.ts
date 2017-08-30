import 'pixi.js';
import '../bin/pixi-spine.js';
import ResourceDictionary = PIXI.loaders.ResourceDictionary;
import Loader = PIXI.loaders.Loader;

//@../node_modules/pixi.js/dist/pixi.min.js
//@../bin/pixi-spine.js

// remove loader middleware which
// automatically loads spine objects
PIXI.loader['_afterMiddleware'].pop();

let app = new PIXI.Application();

document.body.appendChild(app.view);

PIXI.loader
    .add('spineboy_atlas', 'http://esotericsoftware.com/demos/exports/atlas1.atlas')
    .add('spineboy_png', 'http://esotericsoftware.com/demos/exports/atlas1.png')
    .add('spineboy_json', 'http://esotericsoftware.com/demos/exports/demos.json')
    .load((loader: Loader, resources: ResourceDictionary) => {
        const rawSkeletonData = resources['spineboy_json'].data['spineboy'];
        const rawAtlasData = resources['spineboy_atlas'].data; //your atlas file

        const spineAtlas = new PIXI.spine.core.TextureAtlas(rawAtlasData, function (line, callback) {
            callback(PIXI.BaseTexture.from('spineboy_png'));
        });

        const spineAtlasLoader = new PIXI.spine.core.AtlasAttachmentLoader(spineAtlas);
        const spineJsonParser = new PIXI.spine.core.SkeletonJson(spineAtlasLoader);

        spineJsonParser.scale = 2.0;

        const spineData = spineJsonParser.readSkeletonData(rawSkeletonData);

        const animation = new PIXI.spine.Spine(spineData);

        animation.position.set(300, 600);
        animation.scale.set(0.3, 0.3);

        if (animation.state.hasAnimation('walk')) {
            animation.state.setAnimation(0, 'walk', true);
        }

        app.stage.addChild(animation);
        app.start();
    });
