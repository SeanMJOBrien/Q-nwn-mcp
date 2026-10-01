<!-- Source: https://nwnlexicon.com/index.php?title=HideEffectIcon&amp;action=history -->

# HideEffectIcon(effect)

Hides the effect icon of eEffect and of all effects currently linked to it. 
effect HideEffectIcon( effect eEffect);
#### Parameters 

eEffect
    The effect (or linked set of effects) to hide the icon of.
#### Description
Hides the effect icon of eEffect and of all effects currently linked to it. 
The icon is not just hidden from the top right but also the description and character sheet. You cannot hide one or the other (eg to mimic magical item properties which only appear in the examine or character sheet screen not the top right). 
#### Remarks
The effect icons were mostly unhardcoded with the addition of this and EffectIcon. Use this first to set the icon for a linked set of effects to then apply your own (custom or existing) icon with EffectIcon. 
This can be used, for instance, to apply a "Fatigue" effect which is a combination of ability decreases and other penalties. 
Removal of icons cannot be later retrieved so it is worth using TagEffect to mark such effects if you're completely hiding them (without linking to a new EffectIcon). 
Note effect icons from items cannot be removed with this, and still apply as usual; with an item with Haste being the only one that appears in the top right persistently. 
#### Version
This function was added in 1.84.8193.29 of NWN:EE. 
#### Example
void main(){ // Simple Fatigue effect re-using an existing Bioware effecticons.2da line effect eFatigue = EffectLinkEffects(EffectAbilityDecrease(ABILITY_STRENGTH, 2), EffectAbilityDecrease(ABILITY_DEXTERITY, 2)); eFatigue = EffectLinkEffects(eFatigue, EffectMovementSpeedDecrease(50)); // Remove all existing icons eFatigue = HideEffectIcon(eFatigue); // Add the Fatigue icon eFatigue = EffectLinkEffects(eFatigue, EffectIcon(EFFECT_ICON_FATIGUE)); // Modifier: Only removed by resting eFatigue = ExtraordinaryEffect(eFatigue); // Tagged all linked effects as Fatigue related eFatigue = TagEffect(eFatigue, "FATIGUE"); // Apply to object ApplyEffectToObject(DURATION_TYPE_PERMANENT, eFatigue, OBJECT_SELF);}
#### See Also
functions:  |  EffectIcon() SetEffectIconFlashing()
