<!-- Source: https://nwnlexicon.com/index.php/GetNextEffect -->

# GetNextEffect

# GetNextEffect(object)
Determines the next active effect on a creature. 
effect GetNextEffect( object oCreature);
#### Parameters
_oCreature_
The creature to examine for effects 
#### Description
Returns the next in-game effect (poisoned, cursed, etc) on oCreature, and an invalid effect if oCreature does not have any active effects. 
#### Remarks
You must first call GetFirstEffect with the same parameter before using this function for proper operation. 
#### Version
1.26 
#### Example
// this code cycles through the effects active on the first PC and // stores whether s/he is blind or deaf; main(){ effect eEffect = GetFirstEffect(GetFirstPC()); int blind = FALSE; int deaf = FALSE; int possibleDumb = FALSE; while(GetIsEffectValid(eEffect)) { int nType = GetEffectType(eEffect); if(nType == EFFECT_TYPE_BLINDNESS) blind = TRUE; else if(nType == EFFECT_TYPE_DEAF) deaf = TRUE; eEffect = GetNextEffect(GetFirstPC()); } if (deaf == TRUE &amp;&amp; blind == TRUE) possibleDumb = TRUE;}
#### See Also
functions:  |   RemoveEffect
