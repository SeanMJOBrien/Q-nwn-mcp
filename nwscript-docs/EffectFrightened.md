<!-- Source: https://nwnlexicon.com/index.php/EffectFrightened -->

# EffectFrightened()
Create a frightened effect for use in making creatures shaken or flee. 
effect EffectFrightened();
#### Description
Constructor for a frightened effect. 
Frightened creatures run away for enemies and can do nothing else, and also receive a -2 EffectSavingThrowDecrease to all saving throws while under the effects of fear. 
The default heartbeat script defined in the 2da file "statescripts.2da", called "nw_g0_fear" will run every 6 seconds when a creature is affected by fear. This is the same script as EffectTurned uses. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
Conversation actions don't work when the object is frightened. 
Fear can be countered by immunity to fear or mind effects (which FEAT_PERFECT_SELF also grants immunity to). This cannot be bypassed. Note Gaining immunity to fear won't cleanse you of the current fear effects automatically. 
Fear, while it can be applied as all effects can, with 2 or more at once, only 1 heartbeat will fire. 
Also note that most of the statescripts, like the Fear one, uses SetCommandable(). This is alright - it seems to get automatically turned on/off according to the effects used. 
Fear, in the normal game (without an edited feat heartbeat script) will merely run from any enemy which comes within 5 meters - half a NwN tile side length. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
Fear effects are part of the "CREATURE_STATE" suite of effects, which generally affect if a creature can control their actions in some way. 
The fear effect doesn't stack, but more than one can be applied to a creature at once. 
The fear effect has 3 main effects: 
  * It does SetCommandable(FALSE). This stops a creature from altering it's action queue. This also means actions added cannot be cancelled.
  * It applies an internal (invisible to GetFirstEffect) EffectSavingThrowDecrease(SAVING_THROW_ALL, 2, SAVING_THROW_TYPE_ALL). This shows up in the character sheet, although saving throw decreases don't apparently show up in red. Only one is applied - multiple fear effects won't apply it more than once, and all of them have to be removed for the saving throw decrease to also be removed.
  * It will fire the effect script in statescripts.2da line "Fear" every heartbeat (6 seconds) usually. This will use SetCommandable itself to apply the running from enemies action. Modders may change this behaviour.

Due to the simple SetCommandable usage but no alterations to the characters movement/mouth/hands, the creature can actually do things while under this effect. You can use fear (or possibly more effectively with EffectTurned or EffectConfused) to simulate some other mind effect by detecting the effect applied and doing something different in the state script. You can also make fear apply similarly to the D&D game and have different "amounts" of fear do different effects. 
The item property On Hit: Fear will apply the same effect with some linked visual effects, which can be replicated with the example code further down (basically the same as the Fear spell, nw_s0_fear.nss). These On Hit effects have the subtype Magical. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | State - CREATURE_STATE_FRIGHTENED (3) | This effect's internal "state" value is CREATURE_STATE_FRIGHTENED, which is 3.   
#### Version
1.62 
#### Example
// Sample code block to replicate the On Hit: Fear final effects. They are applied as magical effects so can be dispelled (although probably with an invalid caster level - to test!). effect eFear = EffectFrightened(); effect eMind = EffectVisualEffect(VFX_DUR_MIND_AFFECTING_FEAR); effect eDur = EffectVisualEffect(VFX_DUR_CESSATE_NEGATIVE); effect eLink = EffectLinkEffects(eFear, eMind); eLink = EffectLinkEffects(eLink, eDur); ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eLink, oTarget, fDuration);
// Sample code for applying fear to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eFear = EffectFrightened(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_HEAD_EVIL); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eFear, oTarget);}
#### See Also
functions:  | EffectTurned EffectConfused
