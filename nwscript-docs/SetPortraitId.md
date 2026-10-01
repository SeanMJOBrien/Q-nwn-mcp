<!-- Source: https://nwnlexicon.com/index.php/SetPortraitId -->

# SetPortraitId

# SetPortraitId(object, int)
Change the portrait of oTarget to use nPortraitId. 
void SetPortraitId( object oTarget, int nPortraitId);
#### Parameters
_oTarget_
The object for which you are changing the portrait. 
_nPortraitId_
The Id of the new portrait to use. nPortraitId refers to a row in the Portraits.2da. 
#### Description
Change the portrait of oTarget to use nPortraitId. 
#### Remarks
Note: Not all portrait Ids are suitable for use with all object types. Setting the portrait Id will also cause the portrait ResRef to be set to the appropriate portrait ResRef for the Id specified. 
#### Version
1.67 
#### See Also
functions:  |   SetPortraitResRef
