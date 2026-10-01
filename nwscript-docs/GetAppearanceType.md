<!-- Source: https://nwnlexicon.com/index.php/GetAppearanceType -->

# GetAppearanceType(object)
Retrieves the appearance of a specified creature. 
int GetAppearanceType( object oCreature);
#### Parameters 

oCreature
    Creature, placeable or door to return the appearance of.
#### Description
For creatures returns the APPEARANCE_TYPE_* value of a specified creature, which is a reference to a appearance.2da line. 
For placeables the line returned is a line in placeable.2da 
For doors are odd; it returns a line from doortypes.2da, which is 0 for most generic doors. Specific doors however return the line ID as usual. You can use ObjectToJson to get the generic appearance ID if necessary. 
For other objects it returns APPEARANCE_TYPE_INVALID. 
#### Remarks
Since the APPEARANCE_TYPE_* values are references to row numbers in the appearance.2da file - it means that you can use the value returned by this function to determine stuff about the creature such as height, moverate, sizecategory, etc. using Get2DAString. 
You can use SetCreatureAppearanceType to set a different appearence. This will always return the current appearance - including if the person is polymorphed! 
As noted above generic doors you need to use JSON to get their specific appearance type from genericdoors.2da 
#### Version
1.30 
#### Example
// If we are 0 to 6, it is one of the PC's races - we do a // special emote (woohoo cheer emote!)void main(){ // As values are 0+, we can check <= 6 for 0 to 6. if(GetAppearanceType() <= 6) { PlayAnimation(ANIMATION_FIREFORGET_VICTORY1); }}
#### See Also
functions:  |  SetPhenoType GetPhenoType SetCreatureAppearanceType  

constants:  |   APPEARANCE_TYPE_* Constants
