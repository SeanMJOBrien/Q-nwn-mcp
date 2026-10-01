<!-- Source: https://nwnlexicon.com/index.php?title=GetEffectType&amp;action=history -->

# GetEffectType(effect)
Get the type constant of the effect. 
int GetEffectType( effect eEffect, int bAllTypes = FALSE);
#### Parameters 

eEffect
    The effect to compare or examine. 

bAllTypes
    Set to TRUE to return additional values the game used to return EFFECT_INVALIDEFFECT for, specifically: EFFECT_TYPE: APPEAR, CUTSCENE_DOMINATED, DAMAGE, DEATH, DISAPPEAR, HEAL, HITPOINTCHANGEWHENDYING, KNOCKDOWN, MODIFYNUMATTACKS, SUMMON_CREATURE, TAUNT, WOUNDING
#### Description
Returns the effect type (EFFECT_TYPE_*) of the effect being examined. 
Return EFFECT_TYPE_INVALIDEFFECT if effect is invalid, or if bAllTypes is FALSE and it is one of the types specified above. 
#### Remarks
You must first get the effect you wish to examine into a variable before calling this function. Useful when you need to check if a player is under the effects of a certain type before doing something else to them with your scripts. A good example would be checking for protection from evil effects before allowing an evil creature to close to them. 
You can also check effects that are created using an effect function, such as how Bioware checks for effects to make sure a PC is not dominated in nw_i0_spells. 
Note: Permanent item effects - eg Haste, Regenerate, Attack Bonuses can't be retrieved from parsing the creature effects. It only returns temporarily applied ones. To find these loop the equipped items and check the item properties (although you won't be able to easily see if some non-stacking properties need to be counted against each other). 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. GetEffectType() now has a bAllTypes parameter. 
#### See Also
functions:  |   RemoveEffect   

constants:  |   EFFECT_TYPE_* Constants
