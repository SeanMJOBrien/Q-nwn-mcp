<!-- Source: https://nwnlexicon.com/index.php?title=SetCreatureAppearanceType&amp;action=history -->

# SetCreatureAppearanceType(object, int)
Change a creature's appearance 
void SetCreatureAppearanceType( object oCreature, int nAppearanceType);
#### Parameters 

oCreature
    Creature to change appearance of 

nAppearanceType
     APPEARANCE_TYPE_*  or line from appearance.2da
#### Description
Sets the creature's appearance type to the value specified (uses the APPEARANCE_TYPE_XXX constants or see appearance.2da for the line identifiers). To get the current appearance use GetAppearanceType. 
This will not change a creatures portrait. To do this see GetPortraitId/SetPortraitId and GetPortraitResRef/SetPortraitResRef. 
#### Remarks
This will alter a creature's appearance. Unlike EffectPolymorph, most stats do not change with this command. Certain ones (creature size, default speed) do, if they are in the appearance.2da file. Will not change race. Also see known bugs. There may be appearance types you can use with this command which don't have associated constants. Look in your appearance.2da file - for instance, in version 1.61, there's no APPEARANCE_TYPE_BEHOLDER, but using the row number (401) should do the trick, if you have the correct expansion pack installed, that is. 
In NWN:EE (untested in NWN 1.69) if a nAppearanceType line which has no defined appearance is used, the command will not fail and does remove the appearance of the creature - making them completely unselectable by players! (a DM may still find them through the area lists). This may be of benefit to some module builders however who want such an invisible creature for some reason. Note the creature still exists - it can still attack, and will still run it's AI and affect the world, besides being not present visually. You can change the appearance back just fine. 
While using this on a PC do be careful; since it is used for horses (see x3_inc_horse.nss) there is a risk of issues if horses are in use in a module. 
#### Known Bugs
If your creature has, for example, a speed setting of "DM Speed" (super-fast!) and then is turned into a golem (or some other normally slow creature) it then uses the new appearance's speed. It keeps that speed even if it is changed back into its original form. It might be the perception range (a similarly alterable item, related to appearance usually) may also reset and not be recoverable. 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. Fixed SetCreatureAppearanceType() not updating all appearance related variables. 
#### Example
// Script to change us into an Adamantium Golem.void main(){ SetCreatureAppearanceType(OBJECT_SELF, APPEARANCE_TYPE_GOLEM_ADAMANTIUM);}
#### See Also
functions:  |   SetPhenoType  GetAppearanceType GetPortraitId / SetPortraitId GetPortraitResRef / SetPortraitResRef  

constants:  |   APPEARANCE_TYPE_* Constants
