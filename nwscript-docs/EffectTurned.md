<!-- Source: https://nwnlexicon.com/index.php/EffectTurned -->

# EffectTurned()
Returns a new Turned effect. 
effect EffectTurned();
#### Description
Create a Turned effect. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
This effect defaults to SupernaturalEffect. 
#### Remarks
Turning will bypass any Immunity: Fear effects, however, should really only be used in the turn undead script. 
It acts, in NwN at least, exactly as fear does. The default heartbeat script defined in the 2da file "statescripts.2da", called "nw_g0_fear" will run every 6 seconds when a creature is affected by fear. This is the same script as EffectFrightened uses. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
This applies the complex effect CREATURE_STATE_TURNED (4). 
Apart from the specific effect icon this is one of the only ways to apply something that essentially bypasses all immunities (besides being plot) since it is intended to be used against undead who commonly have immunity to normal fear and immunity to mind effects. It's basically a super version of EffectFrightened. 
Like the fear effect has 3 main effects: 
  * It does SetCommandable(FALSE) - this stops a creature from altering it's action queue. This also means actions added cannot be cancelled.
  * It applies an internal (invisible to GetFirstEffect) EffectSavingThrowDecrease(SAVING_THROW_ALL, 2, SAVING_THROW_TYPE_ALL). This shows up in the character sheet, although saving throw decreases don't apparently show up in red. Only one is applied - multiple fear effects won't apply it more than once, and all of them have to be removed for the saving throw decrease to also be removed.
  * It will fire the effect script in statescripts.2da line "Turned" every heartbeat (6 seconds) usually. This will use SetCommandable itself to apply the running from enemies action. Modders may change this behaviour.

nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | State - CREATURE_STATE_TURNED (4) | This effect's internal "state" value is CREATURE_STATE_TURNED, which is 4.   
#### Version
1.62 
#### Example
// Sample code for applying a turning effect to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eTurning = EffectTurned(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_HARM); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eTurning, oTarget);}
#### See Also  
---
