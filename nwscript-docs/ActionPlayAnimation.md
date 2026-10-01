<!-- Source: https://nwnlexicon.com/index.php/ActionPlayAnimation -->

# ActionPlayAnimation(int, float, float)
Plays an animation (fire and forget, looping, or placeable) before executing the next action in the queue. 
void ActionPlayAnimation( int nAnimation, float fSpeed = 1.0, float fDurationSeconds = 0.0f);
### Parameters 

nAnimation
    ANIMATION_* constant representing the animation to play. 

fSpeed
    Speed to play the animation. Higher is faster (not used for ANIMATION_LOOPING_* animations). (Default: 1.0) 

fDurationSeconds
    Duration of the animation. If left at the default value, the animation will play for a split second if at all. Not used for Fire and Forget animations. (Default: 0.0f)
### Description
Cause the action subject to play the animation specified by the constant ANIMATION_*. 
### Remarks
This is an action, so is played when the action queue reaches the command. Contrast this to PlayAnimation(), which fires instantly. 
The best use of this is to queue up multiple animations - the looping ones will not pause (although ActionWait may work to pause it for a while). 
To reset animation state - eg; to stand before bowing - use ANIMATION_LOOPING_PAUSE, the default creature state, before doing another animation. This stops weird issues when say sitting down, then bowing, eg: 
// Properly stands up before bowing, doesn't reset to previous looping animation then (eg; sitting, sleeping)// Note the 0.0 duration for the pauseActionPlayAnimation(ANIMATION_LOOPING_PAUSE);ActionPlayAnimation(ANIMATION_FIREFORGET_BOW);
Movement tends to cancel all animations as well, which is what Bioware tends to use for moving from sleeping/sitting to waypoint walking. 
There are two types of creature animations: _fire-and-forget_ (or FNF), which only plays once and no duration is needed, and _looping_ which play as long as needed and a duration is required for. 
**NOT ALL MODELS HAVE ALL ANIMATIONS.** The animations listed in the constants are not every animation that a model is capable of (there is a dying animation, after all, as well as combat animations and others)... this is just the current list of the ones that can be played via script. 
For placeable objects that are a source of illumination (such as the lamp post), it is not enough to just use its ANIMATION_PLACEABLE_DEACTIVATE or ANIMATION_PLACEABLE_ACTIVATE. That just affects the glowing part of the animation, itself. You must also use the SetPlaceableIllumination() command set to TRUE and tell the area it's in to RecomputeStaticLighting(). 
### Version
1.62 
### Example
// An example of placeable illumination use:// will turn the lightable object on and off when selected// placed in its OnUsed event// Of course, for a placeable, you might as well always use PlayAnimation().void main(){ if (GetLocalInt(OBJECT_SELF,"NW_L_AMION") == 0) { SetLocalInt(OBJECT_SELF,"NW_L_AMION",1); ActionPlayAnimation(ANIMATION_PLACEABLE_ACTIVATE); SetPlaceableIllumination(OBJECT_SELF, TRUE); RecomputeStaticLighting(GetArea(OBJECT_SELF)); } else { SetLocalInt(OBJECT_SELF,"NW_L_AMION",0); ActionPlayAnimation(ANIMATION_PLACEABLE_DEACTIVATE); SetPlaceableIllumination(OBJECT_SELF, FALSE); RecomputeStaticLighting(GetArea(OBJECT_SELF)); }}
### See Also
functions:  | PlayAnimation  

constants:  | ANIMATION_* Constants
