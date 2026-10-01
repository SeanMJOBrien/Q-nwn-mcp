<!-- Source: https://nwnlexicon.com/index.php/SetPortraitResRef -->

# SetPortraitResRef

# SetPortraitResRef(object, string)
Change the portrait of object to use the portrait ResRef. 
void SetPortraitResRef( object oTarget object sPortraitResRef );
#### Parameters
_oTarget_
The object for which you are changing the portrait. 
_sPortraitResRef_
The ResRef of the new portrait to use. 
#### Description
Change the portrait of oTarget to use the Portrait ResRef specified. 
#### Remarks
sPortraitResRef should not include any trailing size letter ( e.g. po_el_f_09_ ).Not all portrait ResRefs are suitable for use with all object types.Setting the portrait ResRef will also cause the portrait Id to be set to PORTRAIT_INVALID. 
#### Known Bugs
#### Version
1.67 
#### See Also
functions:  |   SetPortraitId
