<!-- Source: https://nwnlexicon.com/index.php/GetPortraitId -->

# GetPortraitId

# GetPortraitId(object)
Get the PortraitId of oTarget. 
int GetPortraitId( object oTarget = OBJECT_SELF);
#### Parameters
_oTarget_
The object for which you are getting the portrait Id. 
#### Description
Get the PortraitId of oTarget.Returns the Portrait Id number being used for the object oTarget. The Portrait Id refers to the row number of the Portraits.2da that this portrait is from. If a custom portrait is being used, oTarget is a player object, or on an error returns PORTRAIT_INVALID. In these instances try using GetPortraitResRef() instead. 
#### Version
1.67 
#### See Also
functions:  |   SetPortraitResRef
