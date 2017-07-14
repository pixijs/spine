### Changing the tint

TINT = TINT_SPINE x TINT_SLOT x TINT_ATTACHMENT
 
Spine's tint is defined per model

Attachment is the same for all models and specific attachment.

Slot defines per model per attachment

```js
var spineData = loader.resources['spineBoy'].data;

//TINT_SLOT default value for new ones
spineData.findSlot('legSlot').data.color.b = 0.9; 

var spine = new PIXI.spine.Spine(spineData);

//TINT_SPINE
spine.tint = 0xffdddd; //per model

//TINT_ATTACHMENT these two are the same, defined per ALL OBJECTS, default value was taken from above
spineData.findSlot('legSlot').attachment.color.g = 0.9;
spine.findSlot('legSlot').attachment.color.g = 0.9;

//TINT_SLOT slot of current object, USE IT vvvvv 
spine.skeleton.findSlot('legSlot').color.g = 0.9;

```
