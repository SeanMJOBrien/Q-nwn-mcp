<!-- Source: https://nwnlexicon.com/index.php/AnimActionPlayRandomTalkAnimation -->

# AnimActionPlayRandomTalkAnimation(int)
Play a random talk gesture animation. 
void AnimActionPlayRandomTalkAnimation( int nHDiff);

### Parameters 

nHDiff
    The caller's hit dice (HD) minus the HD of the one being spoken to.
### Description
Play a random talk gesture animation. 
### Remarks
For nHDiff, if a negative hit dice difference (HD caller - HD greeted) is passed in, the caller could do the pleading animation. If nHDiff has a positive difference, the caller could do the taunting animation. 
What animations and voice chats are used is based on a Random(9) call. Some options will also play a voice chat along with the animation. 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### See Also
functions:  | AnimActionPlayRandomGreeting
