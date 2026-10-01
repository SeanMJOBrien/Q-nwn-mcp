<!-- Source: https://nwnlexicon.com/index.php/GetIsEffectValid -->

# GetIsEffectValid(effect)
Determines whether an effect is valid. 
int GetIsEffectValid( effect eEffect);
#### Parameters 

eEffect
    The effect to check for validity.
#### Description
Returns TRUE if eEffect is a valid effect, otherwise FALSE. 
#### Remarks
Typically used on functions that return effects, like GetFirstEffect() or GetNextEffect(). This should return TRUE if you just pass a new effect into it, such as passing GetIsEffectValid(EffectStunned()) will return true. 
#### Known Bugs
Returns FALSE on newly created Link effects, eg GetIsEffectValid(EffectLinkEffects(X, Y));. Also is FALSE on newly created VFX only effects eg; GetIsEffectValid(EffectVisualEffect(X)); 
Returns FALSE on a linked effect containing only EffectVisualEffect() effects, however, this effect produces no visual animations anyway, and does not interfere in looping through effects through GetFirstEffect() and GetNextEffect()(so the game engine may never actually apply it). 
#### Example
// Remove the Paralysis effect// - Jasperre. This was an incorrect loop, you cannot have eFind == EffectTypeX().effect eFind = GetFirstEffect(oTarget);while (GetIsEffectValid(eFind)){ if (GetEffectType(eFind) == EFFECT_TYPE_PARALYZE) { RemoveEffect(oTarget, eFind); } eFind = GetNextEffect(oTarget);}
#### See Also
functions:  |   RemoveEffect
