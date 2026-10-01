<!-- Source: https://nwnlexicon.com/index.php/GetLastSpellCaster -->

# GetLastSpellCaster()
Determines who last cast a spell. 
object GetLastSpellCaster();
#### Description
This is for use in a OnSpellCastAt script, it gets who cast the spell. The spell could have been cast by a creature, placeable or door. Returns OBJECT_INVALID if the caller is not a valid creature, placeable or door. 
#### Remarks
You should not use this function in actual spell scripts. In spell scripts, the object casting the spell will be OBJECT_SELF. 
This function actually doesn't always return the object that was put into EventSpellCastAt. In case that AOE object was passed into EventSpellCastAt, the function will return AOE creator instead. 
#### Known Bugs
GetLastSpellCaster cannot return any area of effects which fire the event, and so may return OBJECT_INVALID (eg; if the object that created it is now logged off or destroyed). 
Not sure if this is intended, although Bioware's own Area of Effect reaction code in the event does take it into account and dispels the creatures own location. 
#### Version
1.61 
#### See Also
functions:  |  GetLastSpellHarmful()  GetLastSpell  

events:  | OnSpellCastAt Event
