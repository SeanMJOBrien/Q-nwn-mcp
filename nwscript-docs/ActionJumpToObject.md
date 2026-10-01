<!-- Source: https://nwnlexicon.com/index.php/ActionJumpToObject -->

# ActionJumpToObject(object, int)
Teleports the calling object to the nearest valid location by the target. 
void ActionJumpToObject( object oTarget, int bWalkStraightLineToPoint = TRUE);

### Parameters 

oTarget
    Target object that will be jumped to 

bWalkStraightLineToPoint
    Unknown (Default: TRUE)
### Description
The calling object will be relocated to the position of oTarget (or as near as possible). This function will work within or across area borders. If oTarget isn't a valid object (or is unspecified) the function call will fail. 
### Remarks
There is no visual effect associated with this action. If you wish one such, you must create it yourself. Using ApplyEffectAtLocation() and ApplyEffectToObject() combined with an EffectVisualEffect() effect is great for doing this. 
Unless you specifically intend to add the jump command into a queue with other actions, it is usually more practical to use JumpToObject, which has an immediate effect. 
Like all spawn and jump-type commands, this will place the calling object in the nearest valid location to the target. 
When a PC leaves an Area or Trigger because you've jumped to a location, it causes the OnExit event of the departed object to fire. 
Does not affect creatures that are dead; they must have HP above 0 for this function to work properly. 
 | This section contains speculation. You can help the NWN Lexicon by verifying whether the speculation is accurate.   

Speculation: The bWalkStraightLineToPoint parameter should make the caller of the function walk to the target if very close to it. This does not happen, and in fact, changing it to FALSE doesn't seem to have any effect. If anyone figures out what this parameter is for, please update this article. 
  * bWalkStraightLineToPoint does not make the creature walk, but rather turn to face its destination and glide toward it in a straight line without moving its legs. (Tested with PC doing the jump.) If set to FALSE, the creature will abruptly appear on its destination. If FALSE, the creature is more likely to end up facing the same way its jump target does. If TRUE, it faces in the direction of its straight line movement. I've only noticed this happening when the object to jump to is in the same area. What happens when jumping between areas?

### Version
1.61 
### Example
// Emulates a teleport spell with lingering visual effectsvoid main(){ // spell target location locSpellTarget = GetLocation(OBJECT_SELF); // teleport target object oJumpTarget = GetObjectByTag("WP_jumpTarget"); ApplyEffectAtLocation(DURATION_TYPE_INSTANT, EffectVisualEffect(VFX_IMP_UNSUMMON), locSpellTarget); ActionWait(2.0); ActionJumpToObject(oJumpTarget);}
### See Also
functions:  | ActionJumpToLocation, JumpToObject  

events:  | OnSpellCastAt Event
