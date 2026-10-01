<!-- Source: https://nwnlexicon.com/index.php?title=GetFirstInPersistentObject&amp;action=history -->

# GetFirstInPersistentObject(object, int, int)
Determines the first object of a specific type that is inside a persistent object. 
object GetFirstInPersistentObject( object oPersistentObject = OBJECT_SELF, int nResidentObjectType = OBJECT_TYPE_CREATURE, int nPersistentZone = PERSISTENT_ZONE_ACTIVE);
#### Parameters 

oPersistentObject
    The object that contains the object; Area of Effects, Triggers or Encounters are valid. (Default: OBJECT_SELF) 

nResidentObjectType
    The object type to find (Default: OBJECT_TYPE_CREATURE) 

nPersistentZone
    Unused (Default:  PERSISTENT_ZONE_ACTIVE )
#### Description
Returns the first object within oPersistentObject of the specified type in order and OBJECT_INVALID if no object is found. 
PERSISTANT_ZONE_FOLLOW does not do anything - using it errors the function. Always use PERSISTENT_ZONE_ACTIVE. 
The order for things got during this is not based on range or anything, but normal works clockwise from west (0.0), but this rarely matters. 
#### Remarks
Used to cycle through all of contained objects via GetNextInPersistentObject(). 
Bioware uses this function in scripts to implement area of effect spells. 
Also note that triggers (and therefore encounters too) are persistent objects, so you can cycle through objects in triggers/encounters using this command. See the code example below. 
The area equivalent of this is GetFirstObjectInArea. 
Like similar functions this won't work on DMs. 
You can use GetIsInSubArea() to check if a single creature is in a subarea, but it won't accept other object types. 
#### Version
1.32 
#### Example
void main(){//The trigger to look inobject oTrigger=GetObjectByTag("killer_trigger");//First object in that trigger. We can use bitwise |//Because of the values of the OBJECT_TYPE_* constantsobject oInTrigger=GetFirstInPersistentObject(oTrigger, OBJECT_TYPE_CREATURE | OBJECT_TYPE_PLACEABLE |OBJECT_TYPE_ITEM);while (GetIsObjectValid(oInTrigger)) { DestroyObject(oInTrigger); oInTrigger=GetNextInPersistentObject(oTrigger, OBJECT_TYPE_CREATURE | OBJECT_TYPE_PLACEABLE |OBJECT_TYPE_ITEM); }}
#### See Also
functions:  |   GetNextInPersistentObject  GetIsInSubArea  

constants:  |   PERSISTENT_ZONE_* Constants
