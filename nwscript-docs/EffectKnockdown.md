<!-- Source: https://nwnlexicon.com/index.php/EffectKnockdown -->

# EffectKnockdown()
Returns a knockdown effect. 
effect EffectKnockdown();
#### Description
Create a Knockdown effect. This effect knocks creatures off their feet, they will sit until the effect is removed. This should be applied as a temporary effect with a 3 second duration minimum (1 second to fall, 1 second sitting, 1 second to get up). 
Knockdown makes a creature prone - dodge AC, dexterity bonuses will not apply and any attacks can be automatic sneak attacks, as they will not be able to react to a sneak attack. 
Knockdown stops movement and plays a special animation - there is no need for a visual effect. Very few models/monsters do not have a "Knockdown" state. 
The target this effect is applied to must be a creature for it to work. This effect cannot be applied instantly or permanently, only temporarily. This is mainly because knockdown does have a standing animation and is hard to remove otherwise. 
#### Remarks
Knockdown is countered by, either high discipline for the feats FEAT_KNOCKDOWN and FEAT_IMPROVED_KNOCKDOWN, or IMMUNITY_TYPE_KNOCKDOWN. 
Knockdown is very powerful - yes, mainly because it is a feat (which represents the P&P "trip" actions), but it does have the similar effect on casters as any thing that stops them moving or casting spells - almost death. 
Knockdown, when removed, should normally stand up, not instantly go to standing. However, the effect type when GetEffectType() is used is 0 - which is the same for a few other effects (see EFFECT_TYPE_* constants). 
#### Effect Breakdown
There is no identifiable information with GetEffectInteger frustratingly, given the GetEffectType bug. 
The main properties of knockdown are: 
  * Target is set to uncommandable ala SetCommandable - this uses a built in engine effect that uses "~AISTATE_CREATURE_CONTROLLABLE"
  * Target plays animation to fall to the ground (this may depend on the creator of the effect and their location - or may be random - which is chosen).
  * Target gets up
  * Target is made commandable again

Note that the commandable state can be altered via. scripting and actions be injected in even though they're in the middle of knockdown, eg: 
// This will knockdown OBJECT_SELF, then after 1.5 seconds moves them 10 meters away from their current location while still "knocked down". When knockdown is removed the person can automatically move again.void Push(float fDuration){ ApplyEffectToObject(DURATION_TYPE_TEMPORARY, EffectVisualEffect(VFX_DUR_FREEZE_ANIMATION), OBJECT_SELF, fDuration); SetCommandable(TRUE, OBJECT_SELF); ActionMoveAwayFromLocation(GetLocation(OBJECT_SELF), TRUE, 10.0); SetCommandable(FALSE, OBJECT_SELF);}void main(){ ApplyEffectToObject(DURATION_TYPE_TEMPORARY, EffectKnockdown(), OBJECT_SELF, 6.0); DelayCommand(1.5, Push(4.5));}
As noted above the minimum duration appears to need to be 1 or 2 seconds to allow the full animations to play else it looks wonky. 
It cannot be applied to plot creatures but can to immortal creatures. 
#### Known Bugs
This returns 0 for GetEffectType, its hard to remove any knockdown without a unique constant! 
#### Version
1.62 
#### Example
// Sample code for applying knockdown (10 seconds) to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eKnockdown = EffectKnockdown(); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_PULSE_WIND); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eKnockdown, oTarget, 10.0);}
#### Knock Down on Back
If you want to force a knockdown animation, you could write a wrapper function that uses ReplaceObjectAnimation to achieve this effect. 
// Knocks down a player onto their back for fDuration.void KnockDownBack(object oPlayer, float fDuration) { ReplaceObjectAnimation(oPlayer, "kdfnt", "kdbck"); ReplaceObjectAnimation(oPlayer, "kdfntps", "kdbckps"); ReplaceObjectAnimation(oPlayer, "kdfntdmg", "kdbckdmg"); AssignCommand(oPlayer, ApplyEffectToObject(DURATION_TYPE_TEMPORARY, EffectKnockdown(), oPlayer, fDuration)); DelayCommand(fDuration, ReplaceObjectAnimation(oPlayer, "kdfnt", "")); DelayCommand(fDuration,ReplaceObjectAnimation(oPlayer, "kdfntps", "")); DelayCommand(fDuration,ReplaceObjectAnimation(oPlayer, "kdfntdmg", ""));}
#### See Also  
---
