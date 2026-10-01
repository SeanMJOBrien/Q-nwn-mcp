<!-- Source: https://nwnlexicon.com/index.php/SetEffectIconFlashing -->

# SetEffectIconFlashing(object, int, int)

Sets whether or not oCreature's nIconId is flashing in their GUI icon bar. 
effect SetEffectIconFlashing( object oCreature, int nIconID, int bFlashing = TRUE);
#### Parameters 

oCreature
    player object to affect 

nIconID
    Referenced to effecticons.2da or EFFECT_ICON_* 

bFlashing
    TRUE to force an existing icon to flash, FALSE to to stop.
#### Description
Sets whether or not oCreature's nIconId is flashing in their GUI icon bar. If oCreature does not have an icon associated with nIconId, nothing happens. This function does not add icons to oCreature's GUI icon bar. The icon will flash until the underlying effect is removed or this function is called again with bFlashing = FALSE. 
#### Remarks
This can be used to show the flashing earlier than the game usually does (which is 5 seconds from it expiring, quite short!), highlight particular effect interactions, or provide GUI feedback when a particular icon is selected for whatever reason. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  EffectIcon() HideEffectIcon()
