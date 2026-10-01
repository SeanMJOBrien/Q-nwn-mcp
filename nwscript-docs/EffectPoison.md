<!-- Source: https://nwnlexicon.com/index.php/EffectPoison -->

# EffectPoison(int)
Create a Poison effect. 
effect EffectPoison( int nPoisonType);
#### Parameters 

nPoisonType
    The type of poison to use, as defined in the  POISON_* constants group or line from poisons.2da
#### Description
Returns a new effect object that when applied to the target will cause them to be Poisoned with the nPoisonType type of poison as defined in the POISON_* constant group. 
No more then 1 poison can affect one target at once, and is a game engine limit, not a scripting one. Poisons from Spells and Creature Attacks (or any item with On Hit: Poison) are the same for this basis, and even if only secondary effects are applied, no new poison can be. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly or temporarily, only permanently. 
#### Remarks
Never apply this temporarily, like disease, as the additional saves and additional damage may not work correctly. 
Notes: Most Poisons do not do hit point damage (and none do any direct damage). Poison effects do not currently stack, they overwrite each other. If the target makes his Saving Throw for the initial effect, he will by default save against the secondary effect. 
See the poisons.2da file for more information about what each poison type does. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
_Note:_ There are two types of in-game poison, only one is accessible by this function and "On Monster Hit: Poison [TYPE]" the other is applied from the "On Hit: Poison". 
Both types will simply fail to apply if there is an existing effect of EFFECT_TYPE_POISON on the target. 
Removing the poison (via. a Healing Kit, dispel magic if it's a magical effect, etc.) will not remove the associated EffectAbilityDecrease applied since they are not linked. Obviously however it'll save you from the second (usually stronger) payload. 
##### EffectPoison / On Monster Hit: Poison [TYPE]
This has a 2 stage effect: 
  * When first applied a fortitude save vs. Poison is carried out against the 2da DC value. If passed the effect is removed instantly. If failed three things occur: 
    * The script file "Script_1" will run instantly
    * A new EffectAbilityDecrease effect, of the same subtype, duration, creator and spell ID if applicable is created and applied using the roll of ability damage from the 2da. This is **not** linked to the main poison effect, and can be blocked as normal by immunities.
    * A change to the running poison effect values for the check done in 60 seconds is setup. This includes many values for "_2" loaded

When 60 seconds has passed: 
  * Apply the payload values stored in the effect; ie a second EffectAbilityDecrease is generated and applied, from the previous rolled value, and the script is run.
  * Remove the poison effect (but leave the ability damage) regardless of the saving throw

##### On Hit: Poison
This is a simpler poison effect that does a single fortitude save vs. Poison that does a hardcoded 1d2 ability damage, then a secondary one at the same DC for the same amount of damage. The effect type is Magical, the duration is Permanent, the creator the creature attacking with the On Hit: Poison effect. 
Due to the removal of the poison effect after 60 seconds (regardless of saves) it is still relatively powerful, and in a larger dungeon will inflict so many ability penalties of that type it can push the value 3 very quickly. 
It can be of any ability value, and the ID in GetEffectInteger(effect, 0) is always the integer "2" which matches POSION_BLADE_BANE. However the save DC's are always even while POSION_BLADE_BANE has a DC of 15, so you can see if it is from the on hit property by testing GetEffectInteger(effect, 0) == 2 and GetEffectInteger(effect, 3) != 15. 
##### Tracing Ability Damage Cause by Poison effects
To remove poison and only the ability damage from poison it is quite difficult if it is from a On Hit: Poison - because the effects created by the engine cannot be tagged, have no spell ID nor can you safely assume ability damage caused by the engine (ie no tag) isn't just the **On Hit: Ability Drain** property. 
This is likely why Neutralise Poison and Remove Disease spells in NWN just remove all ability damage penalties. 
##### Values
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nPoisonType -  POISON_* constants group or "2" if monster on hit | If the effect has not been applied yet then this is the only valid effect integer (when creating the effect in a script but not applying it yet). Once applied other values are populated for the secondary check after "1 turn" (60 seconds). For the On Hit property this always appears to be the number 2 (some internal identifier) which is POISON_BLADE_BANE.   
1 | Secondary Ability Damage to apply ABILITY_* constants group. | Stored from the 2da if applicable, applies this type of ability damage after 1 minute.   
2 | Secondary Ability Damage amount to apply | It appears the 2da values are rolled and stored for the after one minute check. On Hit property always rolls 1d2 so it is either 1 or 2.   
3 | Save DC | The save DC of the poison damage for the fortitude save vs. Poison. Loaded from the poison.2da file for most poisons. On Hit property retrieves it from the appropriate iprp_ 2da file and is always an even value by default (DC 14 through DC 26).   
4 | Day to apply secondary | The internal representation of the "day" of the module to apply the poison payload. Default start module time would return 461132 (Month 6, Day 1, Hour 13, 1372) - ie; 28 * 12 * 1372.   
5 | Time to apply secondary poison | The internal representation of the "time" of the day to apply the poison payload, appears to be in milliseconds (60000 would be 60 seconds). Roughly 60 seconds after start of module time is 1635876 for instance.   
6 | Has secondary effect been applied? | If 1 then the secondary effect has been applied, if 0 then it hasn't yet.   
GetEffectString  
0 | Payload script | If a valid string it will be the script run during the 60 second payload. If blank no script will be run. On Hit type of poison never has this set.   
#### Version
1.62 
#### Example
<nowiki>/* Place this in the OnUsed event of an object. It will remove all bad effects and then cause a new poison to attempt to infect the user of the object each time it is used. It loops through all poison defined in the game.*/</nowiki>//Returns TRUE if any negative effects are found on the target and removes them.int RemoveEffects(object oTarget);void main(){ int nCurrentEffect; int nNextEffect; effect ePoison; object oPC; string sPoison; nCurrentEffect = GetLocalInt(OBJECT_SELF,"nCurrentEffect"); ePoison = EffectPoison(nCurrentEffect); oPC = GetLastUsedBy(); if(RemoveEffects(oPC)){ SendMessageToPC(oPC,"Negative Effects removed."); return; } SendMessageToPC(oPC,"Applying Poison number " + IntToString(nCurrentEffect)); ApplyEffectToObject(DURATION_TYPE_TEMPORARY,ePoison,oPC,30.0f); if( nCurrentEffect == 43) { nNextEffect=0; }else{ nNextEffect=nCurrentEffect+1; } SetLocalInt(OBJECT_SELF,"nCurrentEffect",nNextEffect); SendMessageToPC(oPC,"Next Poison number " + IntToString(nNextEffect)); return;}//Returns TRUE if any negative effects are found on the target and removes them.int RemoveEffects(object oTarget){ //Declare major variables effect eVisual = EffectVisualEffect(VFX_IMP_RESTORATION); int bValid = FALSE; effect eBad = GetFirstEffect(oTarget); //Search for negative effects while(GetIsEffectValid(eBad)) { if (GetEffectType(eBad) == EFFECT_TYPE_ABILITY_DECREASE || GetEffectType(eBad) == EFFECT_TYPE_AC_DECREASE || GetEffectType(eBad) == EFFECT_TYPE_ATTACK_DECREASE || GetEffectType(eBad) == EFFECT_TYPE_DAMAGE_DECREASE || GetEffectType(eBad) == EFFECT_TYPE_DAMAGE_IMMUNITY_DECREASE || GetEffectType(eBad) == EFFECT_TYPE_SAVING_THROW_DECREASE || GetEffectType(eBad) == EFFECT_TYPE_SPELL_RESISTANCE_DECREASE || GetEffectType(eBad) == EFFECT_TYPE_SKILL_DECREASE || GetEffectType(eBad) == EFFECT_TYPE_BLINDNESS || GetEffectType(eBad) == EFFECT_TYPE_DEAF || GetEffectType(eBad) == EFFECT_TYPE_PARALYZE || GetEffectType(eBad) == EFFECT_TYPE_NEGATIVELEVEL || GetEffectType(eBad) == EFFECT_TYPE_FRIGHTENED || GetEffectType(eBad) == EFFECT_TYPE_DAZED || GetEffectType(eBad) == EFFECT_TYPE_CONFUSED || GetEffectType(eBad) == EFFECT_TYPE_POISON || GetEffectType(eBad) == EFFECT_TYPE_DISEASE ) { //Remove effect if it is negative. RemoveEffect(oTarget, eBad); bValid = TRUE; } eBad = GetNextEffect(oTarget); } if(bValid) ApplyEffectToObject(DURATION_TYPE_INSTANT, eVisual, oTarget); return bValid;}
#### See Also
functions:  |   EffectDisease   

constants:  |   POISON_* Constants
