<!-- Source: https://nwnlexicon.com/index.php/AnimActionPlayRandomBasicAnimation -->

# AnimActionPlayRandomBasicAnimation()
Play a random animation that all creatures should have. 
void AnimActionPlayRandomBasicAnimation();

### Description
Play a random animation that all creatures should have. 
### Remarks
This function rolls a random 2, but only has a legit animation for case 1 of the statement since case 0 has been commented out. So if the random comes up as 1, then the "taunt" animation should fire. 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### See Also
functions:  |  AnimActionPlayRandomAnimation
