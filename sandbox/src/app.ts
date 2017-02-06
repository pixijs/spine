/// <reference path="../../bin/pixi-spine.d.ts" />

// stub it temporarily
declare module PIXI
{
    export class Application
    {
        view: Node;
        stage: PIXI.Container;
        start: Function;
    }
}

let app = new PIXI.Application();

document.body.appendChild(app.view);

PIXI.loader
    .add('raptor', '../examples/raptor/raptor.json')
    .load(function (loader, resources) {
        let animation = new PIXI.spine.Spine(resources.raptor.spineData);

        animation.position.set(300, 600);
        animation.scale.set(0.5, 0.5);

        if (animation.state.hasAnimation('walk')) {
            animation.state.setAnimation(0, 'walk', true);
        }

        app.stage.addChild(animation);
        app.start();
    });
