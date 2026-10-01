<!-- Source: https://nwnlexicon.com/index.php/GetNextInPersistentObject -->

# GetNextInPersistentObject

# GetNextInPersistentObject(object, int, int)
Determines the nextobject of a specific type that is inside a persistent object. 
object GetNextInPersistentObject( object oPersistentObject = OBJECT_SELF, OBJECT_TYPE_CREATURE, PERSISTENT_ZONE_ACTIVE);
#### Parameters
_oPersistentObject_
The object that contains the object. (Default: OBJECT_SELF) 
_nResidentObjectType_
 OBJECT_TYPE_CREATURE ) 
_nPersistentZone_
PERSISTENT_ZONE_ACTIVE.  PERSISTENT_ZONE_ACTIVE ) 
#### Description
Returns the nextobject within oPersistentObject of the specified type in order and OBJECT_INVALID if no object is found. 
#### Remarks
You must first call GetFirstInPersistentObject() with the identical parameters for proper execution. Used in Bioware script to implement area of effect spells. Also note that triggers are persistent objects, so you can cycle through objects in triggers using this command. See the code example below. 
#### Version
1.32 
#### Example
void main(){//The trigger to look inobject oTrigger=GetObjectByTag("killer_trigger");//First object in that trigger. We can use bitwise |//Because of the values of the OBJECT_TYPE_* constantsobject oInTrigger=GetFirstInPersistentObject(oTrigger, OBJECT_TYPE_CREATURE | OBJECT_TYPE_PLACEABLE |OBJECT_TYPE_ITEM);while (GetIsObjectValid(oInTrigger)) { DestroyObject(oInTrigger); oInTrigger=GetNextInPersistentObject(oTrigger, OBJECT_TYPE_CREATURE | OBJECT_TYPE_PLACEABLE |OBJECT_TYPE_ITEM); }}
#### See Also
functions:  |   GetFirstInPersistentObject   

constants:  |   PERSISTENT_ZONE_* Constants
