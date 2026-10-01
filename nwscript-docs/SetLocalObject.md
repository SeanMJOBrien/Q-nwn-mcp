<!-- Source: https://nwnlexicon.com/index.php/SetLocalObject -->

# SetLocalObject(object, string, object)
Store an object as a local variable within an object. 
void SetLocalObject( object oObject, string sVarName, object oValue);
#### Parameters 

oObject
    Target object to store local variable in. 

sVarName
    Unique variable name. 

oValue
    Variable being stored in local object.
#### Description
Stores oValue as a local object reference on oObject using the variable name sVarName. The parameter sVarName is a unique string identifying a single local variable. Using the same value for sVarName in subsequent calls will overwrite the original value. 
Objects get assigned a unique reference in a list depending when they are created and what object type they are - for this reason, it is never persistent across server resets or after StartNewModule is called, but is consistent in save games. 
When a PC enters the game, each item they posses is given a new unique object ID reference, so storing references to these objects will be lost if they just log out and log back in. Instead you can use the objects UUID, retrieved with GetObjectUUID and stored with SetLocalString, since UUIDs are fully persistent. 
You don't actually store oValue as a real retriable object, just a reference. 
If the object oValue references is destroyed or expires (if an AOE) or leaves the server (if a PC) it will return an invalid object, however you need to test it with GetIsObjectValid since the object ID will still be returned even if the object doesn't exist anymore so comparisons to OBJECT_INVALID may be faulty. You can see this by using ObjectToString on the given variable returned by this if that object no longer exists. 
#### Remarks
Note that the Campaign version StoreCampaignObject (and newer SQL object storage) actually copies information from the game to the database. This can include local variables if bSaveObjectState is TRUE. These local variables stored on the database object may include SetLocalObject variables, however these should not be relied upon since when retrieved it'll likely be in a state (eg a new module or MP session) where those local variables no longer reference useful object IDs. 
As with all locals, there seems to be no size limit to sVarName, however, anything over 50 characters is probably a bit extreme. 
#### Example
// assumes there is an object tagged "npc_henchment"// running about in the modulevoid main(){ object oThis = OBJECT_SELF; object oObject = GetObjectByTag("npc_henchment"); SetLocalObject(oThis, "hench", oObject);}
#### See Also
functions:  |  GetLocalObject
