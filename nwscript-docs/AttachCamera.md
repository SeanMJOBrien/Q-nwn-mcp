<!-- Source: https://nwnlexicon.com/index.php?title=AttachCamera&amp;action=history -->

# AttachCamera(object, object, int)

Sets the object oPlayer's camera will be attached to. 
void AttachCamera( object oPlayer, object oTarget, int bFindClearView = FALSE);
#### Parameters 

oPlayer
    The player for whom the camera behavior will be updated. 

oTarget
    A valid creature or placeable. If oTarget is OBJECT_INVALID, it will revert the camera back to oPlayer's character. 

bFindClearView
    if TRUE, the client will attempt to find a camera position where oTarget is in view.
#### Description
Sets the object oPlayer's camera will be attached to. 
The target must be known to oPlayer's client, this means it must be in the same area and within visible distance. 
  * SetObjectVisibleDistance() can be used to increase this range.
  * If the target is a creature, it also must be within the perception range of oPlayer and perceived.

Notes: 
  * If oTarget gets destroyed while oPlayer's camera is attached to it, the camera will revert back to oPlayer's character.
  * If oPlayer goes through a transition with its camera attached to a different object, it will revert back to oPlayer's character.
  * The object the player's camera is attached to is not saved when saving the game.

#### Remarks
For use with save games reset this in OnClientEnter (which fires for save games being loaded). 
You can utilise this for more effective cutscenes (the easiest use case since cutscene mode stops the PC doing anything) allowing their original puppet to act away from where the camera is, but also can be used with various camera functions to allow distant manipulation of things. Other ideas can be to have it allow the players avatar to be better positioned for viewing clothing, dyes or other player appearance affecting items. 
You could also do a form of "possession" (kind of) by having it attached to a friendly creature, although any actions from the radial of course will be the players actions. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  SetCameraLimits()
