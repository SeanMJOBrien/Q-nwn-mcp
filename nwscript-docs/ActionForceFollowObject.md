<!-- Source: https://nwnlexicon.com/index.php/ActionForceFollowObject -->

# ActionForceFollowObject(object, float)

Forces an NPC to follow an object. 
void ActionForceFollowObject( object oFollow, float fFollowDistance = 0.0f);
### Parameters 

oFollow
    The object to be followed. 

fFollowDistance
    Follow distance in meters. (Default: 0.0f)
### Description
The action subject will follow oFollow until a ClearAllActions() is called. The subject will stay within fFollowDistance of oFollow, and will always run to keep up. There is no option to force the subject to walk. 
This should not be used for PC's, given the fact it actually jumps the calling creature to oFollow if they are too far away for 15 seconds. This means a heavily encumbered PC who can use this on another party member could easily keep up, just by this jumping them to the target every so often automatically. 
The command kind of calls: 
  * ActionMoveToObject(oFollow, TRUE, fFollowDistance);
  * DelayCommand(15.0, JumpToObject(oFollow)); // Only if not within fFollowDistance range

If you ClearAllActions it will remove the jump to command (so running this command every heartbeat never "jumps" the person). 
### Remarks
oFollow can be set to an immobile object, but the subject will only follow it if it is outside of an inventory. In this case, the effect would be identical to ActionMoveToObject(), however when the item is removed from the inventory and placed back in the game world, the subject will move to it again. By itself, you can not use this function to get an NPC to follow the possessor of an item if the item is the target for oFollow. 
Conversations files usually have two events that call to the "nw_walk_wp")" script (assigned by default). That script calls a ClearAllActions(), removing the ActionForceFollowObject() resulting in the follow being cancelled. 
OnHeartbeat, OnDamaged, and other creature events can ClearAllActions resulting in the follow being cancelled. 
### Known Bugs
While not really a bug, some have complained of a "stutter step" with an NPC following a walking leader. This seems to be because the follower is made to always run with this function and catches up to the leader too quickly. If this is a problem, an alternative script to this could possibly use ActionMoveToObject in onHeartBeat with the leader as the target. 
### Version
1.61 
### Example
// Heartbeat of a Deer summoned using EffectSummonCreature().// The dear follows its master using this action - nothing else really. I mean,// what else should a summoned deer do? Fight? main(){ // Define our master object oMaster = GetMaster(); // stop what we are doing, and move to him - run to him that is ClearAllActions(); ActionForceFollowObject(oMaster);}
### See Also  
---
