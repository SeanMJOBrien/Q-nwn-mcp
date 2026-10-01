<!-- Source: https://nwnlexicon.com/index.php/GetWisdom -->

# GetWisdom

# GetWisdom(object)
Gets the targets Wisdom Ability Score. 
int GetWisdom( object oTarget);
#### Parameters
_oTarget_
The object whose Wisdom you wish to inspect. 
#### Description
Returns the Wisdom Ability value of oTarget. 
#### Remarks
Function can be found in nw_i0_plot.nss on line 750. Very simple function, probably created so the scripters did not have to type out the full call to GetAbilityScore() each time they used it. This merely calls the GetAbilityScore(oTarget, ABILITY_WISDOM) function in that manner. 
#### Requirements
#include " nw_i0_plot " 
#### Version
1.22 
#### See Also
functions:  |   GetIntelligence
