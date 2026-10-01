<!-- Source: https://nwnlexicon.com/index.php/AnimActionPlayRandomGreeting -->

# AnimActionPlayRandomGreeting(int)
Play a greeting animation and possibly voicechat. 
void AnimActionPlayRandomGreeting( int nHDiff);

### Parameters 

nHDiff
    The difference in HitDice of the greeter and the greeted.
### Description
Play a greeting animation and possibly voicechat. 
For nHDiff, if a negative hit dice difference (HD caller - HD greeted) is passed in, the caller will bow. There is also a chance (random 4) that the caller will bow. If the caller does not bow, they will do the ANIMATION_FIREFORGET_GREETING animation. 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### See Also
functions:  |  AnimActionPlayRandomGoodbye
