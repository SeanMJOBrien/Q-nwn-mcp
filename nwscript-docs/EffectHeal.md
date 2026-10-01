<!-- Source: https://nwnlexicon.com/index.php/EffectHeal -->

# EffectHeal(int)
Creates a healing effect. 
effect EffectHeal( int nDamageToHeal);
#### Parameters 

nDamageToHeal
    Hit points to heal.
#### Description
Returns a heal effect that will heal an object nDamageToHeal hit points. This should be applied as an instantaneous effect. 
Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nDamageToHeal < 0. 
EffectHeal doesn't damage undead. Special undead race checks are used for healing spells to damage them, while Harm and similar spells actually heal undead. EffectHeal doesn't take into account anything special. 
The target this effect is applied to must be a creature, placeable or door. This effect can only be applied instantly. 
The limit of nDamageToHeal is unknown. 
#### Remarks
EffectHeal is a way to remove EffectHitPointChangeWhenDying on a dying PC, and also stops the Wounding caused by the special creature/item On Hit properties. 
The feedback on this will be, if the target can be healed at all, something like "Whoever was healed for X damage". X may well be 0 if it is applied when the target has full hit points, and Whoever is always whoever is being healed. To change hit points without feedback see SetCurrentHitPoints. 
EffectHeal won't, in any case, restore lost temporary hit points (thus is the point of them) nor restore a person when they are dead (-11HP or lower, use EffectResurrection instead). It will also not remove temporary hit points in an attempt to get to the creatures maximum hit points (thus having 10 temporary HP and fully healing means you end up with max HP + 10). 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare effects, and apply them using an ApplyEffectToObject() Command. See the Effect Tutorial for more details. 
#### Effect Breakdown
Since this is an instant effect there isn't much use in checking an effect, but you can do - GetEffectInteger works fine. 
Not much to add to the above remarks. As with all instant effects the same script can see the change in hitpoints, for instance in this script the second speakstring will see the change in hit points. 
SpeakString("Current HP:" + IntToString(GetCurrentHitPoints()));ApplyEffectToObject(DURATION_TYPE_PERMANENT, EffectHeal(1), OBJECT_SELF);SpeakString("Current HP:" + IntToString(GetCurrentHitPoints()));
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nDamageToHeal | Amount of damage to heal.   
#### Version
1.62 
#### Example
// oUser = object that last used the calling object// used it in the below example to fire an OnUsed event on a// placeable, usable object (a shaft of light)void main(){ object oUser = GetLastUsedBy(); effect eHeal = EffectHeal(10); if (GetIsObjectValid(oUser)) { // heal the user ApplyEffectToObject(DURATION_TYPE_INSTANT, eHeal, oUser); }}// Sample code for applying 10 damage healing effect to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eHeal = EffectHeal(10); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_HEALING_G); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_INSTANT, eHeal, oTarget);}
#### See Also
constants:  |   EFFECT_TYPE_* Constants
