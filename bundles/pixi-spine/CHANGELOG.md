# Change Log - @pixi-spine

## 3.0.0

_Initial release_

### Breaking changes

- Start using `rush` build tool
- Combine spine runtimes `3.7`, `3.8` and `4.0` in main bundle
- Finally pixi-spine does not require PIXI to be in global scope
- Vanilla JS supported with restriction: only `3.8` classes are exposed in global scope, however `3.7` and `4.0 ` models work anyway
  
### Patches
- AttachmentTimeline animation does not squish meshes anymore (https://github.com/pixijs/pixi-spine/pull/385)
