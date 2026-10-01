<!-- Source: https://nwnlexicon.com/index.php/EffectParalyze -->

# EffectParalyze()
Returns a new Paralyze effect. 
effect EffectParalyze();
#### Description
Create a Paralyze effect. 
Paralysis is not a mind effect - it stops all movement (and also in-game pauses the creature in their current action), and so they are prone, have no dexterity or strength (act as if had the lowest, 3) and all sneak attacks work against them. 
By default creatures level 4 and below in 10 meters can be "coup de grace" ie instantly killed on a successful hit. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
You can be immune to paralysis if you have direct immunity to it, or the "Freedom" effect on a hide or item. 
Most EffectParalyze go with VFX_DUR_PARALYZED and/or VFX_DUR_PARALYZE_HOLD as visual indicators of it. 
To make the creature entirely freeze the VFX_DUR_FREEZE_ANIMATION visual effect must be applied (uses progfx.2da line 1300) to actually see the creature stop moving and become rigid - use it in a link with the paralysis to work correctly. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
The effect has a single variable with the internal "complex state" of CREATURE_STATE_HELD (value 8) applied. 
This seems to be also used for FEAT_DEATH_ATTACK (which very particularly bypasses IMMUNITY_TYPE_MIND_SPELLS, but not IMMUNITY_TYPE_PARALYSIS - by being supernatural and effect integer 1 being set to 1) and On Hit: Paralysis effects. 
The effect seems to have these key features: 
  * Immunities are granted by IMMUNITY_TYPE_PARALYSIS, but also hardcoded to feat lines FEAT_TOUGH_AS_BONE (Pale Master) and FEAT_DRAGON_IMMUNE_PARALYSIS (Dragon Disciple).
  * If a target is under the effect of paralysis and is level 4 or below (coded as COUP_DE_GRACE_LEVEL_LIMIT) and is attacked by a successful attack within a 10M (coded as ruleset.2da value MAX_RANGED_COUP_DE_GRACE) it will apply EffectDeath to the creature
  * Will set the creature to be unable to use several things: ~AISTATE_CREATURE_USE_LEGS & ~AISTATE_CREATURE_USE_HANDS & ~AISTATE_CREATURE_USE_MOUTH 
    * No Legs - No movement can take place (counts as flatfooted applying various penalties)
    * No Hands - No spells with somatic components can be cast (also counts as flatfooted applying various penalties)
    * No Mouth - No spells with verbal components can be cast
  * The creature will be set to uncommandable, essentially SetCommandable(FALSE) is done on them. You can unset this, but the 3 effects to the legs, hands and mouth mean not much can take place anyway.

Need to test if a spell with no verbal or somatic components can be cast if SetCommandable(TRUE) is done. 
Note there is no visual change - as noted above you must use your own "Freezing" animation. This is in stark contrast to EffectPetrify which applies a "stone" effect and stops the animations. 
Creatures are immune to most paralysis effects when they have IMMUNITY_TYPE_PARALYSIS (which includes FEAT_TOUGH_AS_BONE and FEAT_IMMUNITY_TO_PARALYSIS), or IMMUNITY_TYPE_MIND_SPELLS - which has the sole exception of the hardcoded FEAT_DEATH_ATTACK as noted above. It also cannot be applied to plot, immortal or dead creatures. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nState - always 8, CREATURE_STATE_HELD |   
1 | Is Death Attack / Bypass Mind Immunities | Set to 1 if from FEAT_DEATH_ATTACK ("Flag this hold effect as a Death Attack."). It appears just having the effect be supernatural will not bypass IMMUNITY_TYPE_MIND_SPELLS, but this being set also will do.   
#### Version
1.62 
#### Example
// Sample code for applying paralysis (but no visual) to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eParalyze = EffectParalyze(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_HEAD_EVIL); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object ApplyEffectToObject(DURATION_TYPE_PERMANENT, eParalyze, oTarget);}
#### See Also
functions:  |   EffectPetrify
