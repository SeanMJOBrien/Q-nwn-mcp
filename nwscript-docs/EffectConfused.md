<!-- Source: https://nwnlexicon.com/index.php/EffectConfused -->

# EffectConfused()
Creates a confusion effect. 
effect EffectConfused();
#### Description
This function returns a confusion effect. This effect can then be applied to a creature. 
The confusion script, declared in "statescripts.2da" and by default is "nw_g0_confuse" does the actions each round (heartbeat) for a creature affected with confusion. While confused the creature is otherwise uncommandable. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
This is a mind-effect and will be blocked by mind immunities. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
The effect has a single variable with the internal "complex state" of CREATURE_STATE_CONFUSED (value 2) applied. 
There is an On Hit: Confusion effect which links this to an EffectVisualEffect(VFX_DUR_MIND_AFFECTING_DISABLED). 
When initially confused the creature inherently is set to not commandable and all actions are cleared. 
In the statescript.2da script, which defaults to nw_g0_confuse, you can see the script will set them to commandable to have them do a random action, then back to uncommandable so that action cannot be cancelled. At the end of confusion the commandable state is automatically reset to normal. Note that nw_g0_confuse is pretty simple, it will roll a d10 and: 
  * On a 1 call ActionRandomWalk
  * Between 2 and 6 stand there, with ClearAllActions(TRUE). This makes it flat footed usually.
  * Between 7 and 10 will ActionAttack the nearest creature object. It won't check if it can see, hear or even reach the creature however so this can just fail.

3.0 and 3.5 both have a much more comprehensive list of confusion based actions, and reactions if attacked (the creature should then attack back, not stand there) as well as a chance for the creature to act normally (which should mean a player can control their PC for 6 seconds, or for the AI run a normal combat round). Due to the default script just attacking the nearest creature, it sure can do some odd things with faction reputations as well. 
Since the confusion effect is pretty similar to some other mind-affecting effects such as 3.5E's "Fascinated" you can reuse this effect and do something different in nw_g0_confuse depending on the source of "confusion". 
You can be immune to confusion through IMMUNITY_TIME_MIND_SPELLS (which also includes FEAT_PERFECT_SELF) and/or IMMUNITY_TYPE_CONFUSED. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nState - always 2, CREATURE_STATE_CONFUSED |   
#### Version
1.29 
#### Example
// Sample code for applying a confusion effect to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eDrain = EffectConfused(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_CONFUSION_S); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eDrain, oTarget);}
#### See Also  
---
