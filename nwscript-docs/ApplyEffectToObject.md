<!-- Source: https://nwnlexicon.com/index.php/ApplyEffectToObject -->

# ApplyEffectToObject(int, effect, object, float)

Applies an effect (visual or actual) to an object. 
void ApplyEffectToObject( int nDurationType, effect eEffect, object oTarget, float fDuration = 0.0f);
### Parameters 

nDurationType
    The type of duration to apply; a DURATION_TYPE_* constant. 

eEffect
    The effect to apply. 

oTarget
    The target of the effect. 

fDuration
    The duration of temporary effects. (Default: 0.0f)
### Description
Applies an effect to an object. Effects range from the purely visual (EffectVisualEffect) through beneficial (EffectHeal), wide-ranging (EffectAreaOfEffect) to fatal (EffectDeath), with many variations in between. 
Effects need to be constructed before they can be applied, and the valid nDurationType values depend on the Effect constructed. Refer to the individual Effect functions for details on the effect you want to apply. 
Effects can also be flagged as "Extraordinary", "Magical", or "Supernatural", so an effect applied as "Extraordinary" should not be dispelled by magical means (IE: EffectDispelMagicXXX()). 
For your own sanity it is worth using TagEffect to make an effect uniquely identifiable later unless it is a temporary or spell script effect. 
### Remarks
The object that this command is applied to has to be usable or, at least, not static (for a placeable). This includes, obviously, no triggers, areas, modules, waypoints, or items (on the ground or otherwise). 
Using ApplyEffectAtLocation() and GetLocation() avoids having to have a usable object as the target for a visual effect. 
The object the script is running on will be the effect creator (See GetEffectCreator). If the effect damages or kills the target, effect creator's name will appear as the killer/damager. Modules and areas appear as "Someone". If you cannot personally see the creator of an effect which damages you or an ally, the creator's name will appear as "Someone". 
Note that the Extraordinary (cannot be dispelled) and Supernatural (isn't removed by resting) or Unyielding (not removed on death) sub-types of effects do not matter and will not affect anything applied with DURATION_TYPE_INSTANT. 
Note that the effects are applied instantly and apply during the same script run, for instance EffectImmunity(IMMUNITY_TYPE_CONFUSED) before EffectConfused will have the immunity be correctly applied. This also means EffectDamage can run a objects OnDamaged script - so it's recommended to use DelayCommand with damage/death effects to not have your script then fail for some reason (ie the creature script doing something that affects your parent script). However effects cannot be removed instantly - RemoveEffect marks things to be removed after script completion, so you can't apply an effect, and remove it, in the same script section. 
### Known Bugs
If you apply any temporary/permanent effect (for example, EffectSpellResistanceDecrease) as DURATION_TYPE_INSTANT, it can never be removed in any way whatsoever. 
### Example
// In the Actions Taken of a conversation node... this PC// has made a near-fatal faux pas - almost like harm's damage.void main(){ // Get the person to do damage to, and the damage to do. object oPC = GetPCSpeaker(); // In a word, fatal is certainly having only 1 HP left! int nHealth = GetCurrentHitPoints(oPC) - 1; // Declare the damage - visuals, however, are not automatic. effect eOuch = EffectDamage(nHealth, DAMAGE_TYPE_DIVINE); // Apply the damage instantly ApplyEffectToObject(DURATION_TYPE_INSTANT, eOuch, oPC);}// Example of applying a linked duration effect to the PC speaker,// perhaps, in this case of a Freedom-type link, and visual, // the conversational NPC has cast a protective spell on the PC.void main(){ // Get the person to do the "spell" to to do. object oPC = GetPCSpeaker(); // Declare the immunity to entangle, movement speed // decreases, and the duration effect effect eSlowImmune = EffectImmunity(IMMUNITY_MOVEMENT_SPEED_DECREASE); effect eEntangleImmune = EffectImmunity(IMMUNITY_ENTANGLE); effect eDuration = EffectVisualEffect(VFX_DUR_FREEDOM); // we specially link the effects before applying them. If this was  // a hostile spell, such as a Slowing effect, and they were // immune to slow, which was linked with an appropriate visual, // it would not apply the visual if the slow didn't work. // The second reason is dispelling, they should all be removed  // together if dispelled. effect eLink = EffectLinkEffects(eSlowImmune, eEntangleImmune); eLink = EffectLinkEffects(eLink, eDuration); // Note: We can apply it as a supernatural or extraordinary // effect here, after its been linked, if we wished. //eLink = EffectExtraodinaryEffect(eLink); //eLink = EffectSupernaturalEffect(eLink); // Apply the duration effect for fDuration. ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eLink, oPC, fDuration); // Optional: Maybe it was permanent? no duration needed! //ApplyEffectToObject(DURATION_TYPE_PERMANENT, eLink, oPC);}
### See Also
functions:  | ApplyEffectAtLocation, Effect Functions  

constants:  | DURATION_TYPE_* Constants  
events:  | OnSpellCastAt Event
