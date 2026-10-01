<!-- Source: https://nwnlexicon.com/index.php?title=EffectIcon&amp;action=history -->

# EffectIcon(int)

Create an Icon effect. 
effect EffectIcon( int nIconID);
#### Parameters 

nIconID
    The effect icon (EFFECT_ICON_*/effecticons.2da line) to display. Using the icon for Poison/Disease will also color the health bar green/brown, useful to simulate custom poisons/diseases.
#### Description
Create an Icon effect. 
Icons appear in the top right and in the character sheet and examine panels. 
Using the icon for Poison/Disease will also color the health bar green/brown, useful to simulate custom poisons/diseases. 
Returns an effect of type EFFECT_TYPE_INVALIDEFFECT when nIconID is < 1 or > 255. 
#### Remarks
The effect icons were mostly unhardcoded with the addition of this and HideEffectIcon. Use HideEffectIcon first to remove the icon for a linked set of effects, then use this function to apply your own (custom or existing) icon. 
This can be used, for instance, to apply a "Fatigue" effect which is a combination of ability decreases and other penalties. 
#### Effect Breakdown
This applies a new icon, it can be linked to other effects or be free standing (as a marker, for instance if you added a custom curse; "Curse of Desolation" which does functionally nothing to statistics but has a fancy icon to remind the player it is ongoing and can be checked in scripts). 
If you apply it in a link with other effects that already apply icons all the icons will be applied as usual. To alter this of course use HideEffectIcon before linking this one in. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nIconID - EFFECT_ICON_* | The icon that will be displayed.   
#### Version
This function was added in 1.84.8193.29 of NWN:EE. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed Effect Icons (EffectIcon) getting removed from the top bar if there are icons from permanent effects still in effect. 
#### Example
void main(){ // Simple Fatigue effect re-using an existing Bioware effecticons.2da line effect eFatigue = EffectLinkEffects(EffectAbilityDecrease(ABILITY_STRENGTH, 2), EffectAbilityDecrease(ABILITY_DEXTERITY, 2)); eFatigue = EffectLinkEffects(eFatigue, EffectMovementSpeedDecrease(50)); // Remove all existing icons eFatigue = HideEffectIcon(eFatigue); // Add the Fatigue icon eFatigue = EffectLinkEffects(eFatigue, EffectIcon(EFFECT_ICON_FATIGUE)); // Modifier: Only removed by resting eFatigue = ExtraordinaryEffect(eFatigue); // Tagged all linked effects as Fatigue related eFatigue = TagEffect(eFatigue, "FATIGUE"); // Apply to object ApplyEffectToObject(DURATION_TYPE_PERMANENT, eFatigue, OBJECT_SELF);}
#### See Also
functions:  |  HideEffectIcon() SetEffectIconFlashing()
