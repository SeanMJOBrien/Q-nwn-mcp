<!-- Source: https://nwnlexicon.com/index.php?title=GetEffectInteger&amp;action=history -->

# GetEffectInteger(effect, int)
Retrieves an integer parameter of an effect. 
int GetEffectInteger( effect eEffect, int nIndex);
#### Parameters 

eEffect
    The effect to check a parameter of 

nIndex
    The index of the parameter. The limit of this index depends on the effect tested.
#### Description
Get the integer parameter of eEffect at nIndex. 
Effects can use a variable amount of indexes, notably EffectDamage will use a high amount due to having up to 32 damage types and additional parameters. 
Returns: the value or 0 on error/when not set. 
#### Remarks
This digs into an effect to get some values that are currently set on it. For instance EffectDamageResistance you can figure out what damage is being resisted, by what amount and if there is a limit. These numbers may dynamically change during runtime (such as damage resistance running out). 
See the other types of effect values with GetEffectFloat, GetEffectString, GetEffectObject and GetEffectVector. 
The experimentation of this function has been documented on the lexicon; you can find GetEffectInteger information on the Effect Constructor Functions. 
You can get integer information from the vast majority of effects: 
  * EffectAbilityDecrease / EffectAbilityIncrease
  * EffectACDecrease / EffectACIncrease
  * EffectAppear / EffectDisappear (both only before application) / EffectDisappearAppear
  * EffectAreaOfEffect (when applied to a creature)
  * EffectAttackDecrease / EffectAttackIncrease
  * EffectBeam
  * EffectBlindness
  * EffectConcealment / EffectMissChance
  * EffectCurse
  * EffectDamage (only before application)
  * EffectDamageDecrease / EffectDamageIncrease
  * EffectDamageImmunityDecrease / EffectDamageImmunityIncrease
  * EffectDamageReduction
  * EffectDamageResistance
  * EffectDamageShield
  * EffectDeath (only before application)
  * EffectDisease
  * EffectDispelMagicAll / EffectDispelMagicBest
  * EffectEthereal / EffectSanctuary
  * EffectHeal (only before application)
  * EffectImmunity
  * EffectInvisibility
  * EffectModifyAttacks
  * EffectMovementSpeedDecrease / EffectMovementSpeedIncrease
  * EffectNegativeLevel
  * EffectPoison
  * EffectPolymorph
  * EffectRegenerate
  * EffectSavingThrowDecrease / EffectSavingThrowIncrease
  * EffectSkillDecrease / EffectSkillIncrease
  * EffectSpellFailure
  * EffectSpellImmunity
  * EffectSpellLevelAbsorption
  * EffectSpellResistanceDecrease / EffectSpellResistanceIncrease
  * EffectSummonCreature
  * EffectSwarm
  * EffectTurnResistanceDecrease / EffectTurnResistanceIncrease
  * EffectVisualEffect

The "Stateful" effects have mostly just their internal state effect ID. If one of these is applied the highest numbered one takes effect (eg; Sleep is higher priority then Daze, so if sleep is applied the dazed person then sleeps). 
  * EffectCharmed / EffectConfused / EffectCutsceneDominated / EffectCutsceneImmobilize / EffectCutsceneParalyze / EffectDazed / EffectDominated / EffectFrightened / EffectParalyze / EffectPetrify / EffectSleep / EffectStunned / EffectTurned

Finally there are a few "hidden" engine-only effects without effect constructor function pages, eg; Wounding (which is detected as EFFECT_TYPE_INVALIDEFFECT), which oddly is also set to GetEffectSubType value of 0. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | Amount of damage being applied | The damage is EffectDamage but essentially DAMAGE_TYPE_PHYSICAL with no penetration (DAMAGE_POWER_NORMAL).   
1 | Day damage last applied |   
1 | Time in milliseconds damage was last applied | Needs to be 6000 later to apply another round of damage.   
#### Version
This function was added in 1.83.8193.21 of NWN:EE. 
This function was updated in 1.87.8193.35 of NWN:EE. Now can return all the effect integers for effects with more than 8 integers, like EffectDamage. 
This function was updated in 1.89.8193.37 of NWN:EE. VM: Added unique identifier for the source of EFFECT_TYPE_ABILITY_DECREASE (EffectAbilityDecrease) retrievable with GetEffectInteger(e, 2) 
#### Example
// OnUsed event to tell the person their EffectDamageResistance properties.void main(){ object oUser = GetLastUsedBy(); effect eEffect = GetFirstEffect(oUser); while(GetIsEffectValid(eEffect)) { if(GetEffectType(eEffect) == EFFECT_TYPE_DAMAGE_RESISTANCE) { int nDamageType = GetEffectInteger(eEffect, 0); int nAmount = GetEffectInteger(eEffect, 1); int nLimit = GetEffectInteger(eEffect, 2); SendMessageToPC(oUser, "Damage Resistance Found. Damage Type: " + [IntToString(nDamageType) + "] Amount: " + [IntToString(nAmount) + "] Limit Remaining: " + [IntToString(nLimit) + "]"); } eEffect = GetNextEffect(oUser); }}
#### See Also
functions:  |  Effect Constructor Functions GetEffectFloat, GetEffectString, GetEffectObject, GetEffectVector  

constants:  |  Various constants, see Effect Constructors.
