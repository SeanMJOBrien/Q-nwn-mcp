<!-- Source: https://nwnlexicon.com/index.php/GetFirstEffect -->

# GetFirstEffect(object)
Determines the first active effect on a creature. 
effect GetFirstEffect( object oCreature);
#### Parameters 

oCreature
    The creature to examine for effects.
#### Description
Returns the first in-game effect (poisoned, cursed, etc.) on oCreature, and an invalid effect if oCreature does not have any active effects. 
#### Remarks
The effects returned by this (and GetNextEffect) will be actually usable using ApplyEffectToObject. However be wary - some effects are tied to odd cases like Taunt or Knockdown, and it copies over most (if not all?) of the information such as spell ID and caster level. This has not been exhaustively tested and it'd be hard to do this given many effects have invalid effect IDs using GetEffectType. Links are also lost - or as it were, if you apply an effect it won't automatically apply the other linked ones. 
Without links, which most spells use, the RemoveEffect and EffectDispelMagicAll (/Best) may not function as intended. These could potentially be recreated of course. 
#### Version
1.22 
#### Example
// this code cycles through the effects active on the first PC and // stores whether s/he is blind or deafvoid main(){ int bBlind = FALSE; int bDeaf = FALSE; int bPossibleDumb = FALSE; int nType; object oPC = GetFirstPC(); effect eEffect = GetFirstEffect(oPC); while(GetIsEffectValid(eEffect)) { nType = GetEffectType(eEffect); if(nType == EFFECT_TYPE_BLINDNESS) bBlind = TRUE; else if(nType == EFFECT_TYPE_DEAF) bDeaf = TRUE; eEffect = GetNextEffect(oPC); } if (bDeaf == TRUE && bBlind == TRUE) bPossibleDumb = TRUE;}
#### See Also
functions:  |   RemoveEffect
