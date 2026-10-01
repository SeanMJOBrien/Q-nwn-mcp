<!-- Source: https://nwnlexicon.com/index.php?title=EffectAbilityDecrease&amp;action=history -->

# EffectAbilityDecrease(int, int)
Creates an ability decreasing effect on specified ability score. 
effect EffectAbilityDecrease( int nAbility, int nModifyBy);
#### Parameters 

nAbility
    Ability score to reduce - ABILITY_* constant 

nModifyBy
    This is the amount by which to decrement the ability score.
#### Description
Removes specified amount nModifyBy from nAbility score on an creature. nModifyBy must be a positive number if a negative number is passed, nothing occurs. 
The limit of the total amount of ability decreases is sought by GetAbilityPenaltyLimit (default 30). This decrease limit is much higher than the positive default limit (GetAbilityBonusLimit, default 12), however with a lot of spells that decrease scores at epic levels it can reach this limit. 
If the effect is applied without a delay in the script, then the ability score should change immediately if using GetAbilityScore after the ApplyEffectToObject call if it successfully did something (ie the target isn't immune, and the score isn't already at 3 - see Remarks). 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
You can have multiple ability decrease effects present (for the same ability score) but once 3 is reached no further ability decreases are applied. When this is reached (checkable with GetAbilityScore for instance) any new ability decreases are simply not applied. For instance at 10 Strength, applying EffectAbilityDecrease(ABILITY_STRENGTH, 2); several times causes it to go: 
  * 10 - 2 = 8
  * 8 - 2 = 6
  * 6 - 2 = 4
  * 6 - 2 = 2, oops. So 6 - 1 = 3 works, let's apply just -1 penalty.
  * 3 - 2 = 1, oops. Cannot remove more score, do not apply!

This ends up with 4 ability decreases in total. Confusing but at least it stops it overflowing back round to 255. However there are some obvious gotchas: 
  * The amount you put into nModifyBy can be changed without you realising (unless you check the effect after being applied).
  * Having several short duration ability decreases would stop a longer duration but higher amount ability decrease (albeit most default ability decreases are reasonably permanent).
  * Having an ability increase temporary by a large amount, then applying a larger decrease (eg: 10 Strength, +10 from an ability increase, -15 from a ability decrease for a final 5 but would be "-5" if you took 15 off 10) can actually have the ability decrease "remember" the 15 and apply properly and go to the minimum of 3 correctly. This does raise the question why further full ability decreases couldn't be applied, or they retain their original decrease amounts.

As per the last example above a potential workaround might be to apply an ability increase then a decrease to get the full effect applied (when the increase is removed) but the games default ability increase caps are quite low (+12) so it can still be limiting. 
Unlike other effects, when struck by ability decrease immunity (or a limit, such as applying -3 when already at 3 ability score), other effects in link will be applied. The ability decrease effect gets destroyed and so a partial linked set of effect is applied. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
The effect is essentially the same from all types of application: 
  * This scripted function (used for spells etc.). Can have various subtypes, durations and ability decrease amounts.
  * On Hit: Ability Score Decrease item property. It does a decrease of -1. The subtype is Extraordinary. Duration is permanent.
  * On Monster Hit: Ability Score Decrease item property It does a decrease of -1. The subtype is Supernatural. Duration is permanent.
  * EffectPoison / On Hit: Poison: Applied using the parent poisons properties, but as a separate unlinked effect.
  * EffectDisease: Applied using the parent diseases properties, but as a separate unlinked effect.
  * Crippling Strike Rogue Feat: By default a -2 Strength penalty applied permanently. Note the subtype will be "0" or not set, similar to other feats.
  * Called Shot: Leg Feat: By default a -4 Dexterity penalty for by 30.0 seconds. Subtype will be "0" or not set, similar to other feats. Note this effect is unlinked from the movement speed decrease.

Some of the feat applied effect amounts can be altered (and possibly removed) with ruleset.2da changes. 
Note there are two effects that do apply ability decreases but these are not accessible using GetFirstEffect/GetNextEffect as new effects (they're compiled into the parent effect), see those page for more information: 
  * EffectEntangle essentially does an internal -4 Dexterity penalty (plus weird things with being legs being entangled also affecting Dexterity)
  * EffectCurse does appropriate ability decreases

All the ability decreases at point of creation, if you are immune to ability decreases, do not apply but the parent effect may still continue to show (just not doing much in the case of curse in particular). 
There are also item properties that apply ability decreases, handled in-engine entirely (although you can summarise them by searching the equipped item properties). 
Once a statistic is altered - just like EffectAbilityIncrease - changes to secondary statistics (AC, HP, saves, available spell slots) are done. If a casting statistic is lowered by enough then spells may not be able to be cast. 
Spells using this effect will not stack if more than one is applied using the same ID. Only the first instance of an effect is taken. You can check this with GetEffectSpellId. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nAbility - ABILITY_* | The ability being reduced.   
1 | nModifyBy | Will be reduced if the total ability score when it is applied would take it below 3.   
2 | Source | Added in 1.89.8193.37, this is a codified source of the ability decrease effect: 0 = general direct EffectAbilityDecrease 1 = poison payload 2 = disease payload 3 = called shot 4 = crippling strike 5 = On Hit: Ability Drain item property Note Curse ability modifiers are not visible to scripting so do not get this identifier.   
#### Version
This function was updated in 1.89.8193.37 of NWN:EE. VM: Added unique identifier for the source of EFFECT_TYPE_ABILITY_DECREASE (EffectAbilityDecrease) retrievable with GetEffectInteger(e, 2) 
#### Example
// Sample code for applying 1 strength damage to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eDrain = EffectAbilityDecrease(ABILITY_STRENGTH, 1); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_REDUCE_ABILITY_SCORE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eDrain, oTarget);}
#### See Also
functions:  | EffectAbilityIncrease EffectCurse EffectEntangle EffectPoison EffectDisease  

constants:  |  ABILITY_* Constants
