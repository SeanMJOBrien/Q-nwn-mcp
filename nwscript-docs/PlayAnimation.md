<!-- Source: https://nwnlexicon.com/index.php/PlayAnimation -->

# PlayAnimation

# PlayAnimation(int, float, float)
Play an animation. 
void PlayAnimation( int nAnimation, float fSpeed = 1.0, float fSeconds = 0.0);
#### Parameters
_nAnimation_
 ANIMATION_* 
_fSpeed_
The speed of the animation. (Default: 1.0) 
_fSeconds_
Duration of the animation in seconds (this is not used for fire and forget animations). (Default: 0.0) 
#### Description
Play nAnimation immediately on the object that called this function. Most animations apply to creatures, but not all creatures can be made to perform each animation. ANIMATION_PLACEABLES_* work on placeables. The fSpeed parameter can be used to speed up or slow down the animation. 1.0 is normal speed. The fSeconds parameter is only used with looping animations (ANIMATION_LOOPING_*) and determines how long the creature will perform that animation. A common parameter for looping animations is 6.0, as it means that the creature spends a full round doing that animation. ANIMATION_FIREFORGET_* animations do not need fSeconds to be provided. 
#### Version
1.22 
#### See Also
functions:  |   ActionPlayAnimation   

constants:  |   ANIMATION_* Constants
