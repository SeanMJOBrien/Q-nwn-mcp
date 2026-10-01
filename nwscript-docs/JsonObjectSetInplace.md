<!-- Source: https://nwnlexicon.com/index.php?title=JsonObjectSetInplace&amp;action=history -->

# JsonObjectSetInplace(json, string, json)
Modifies jObject in-place (with no memory copies of the full object). 
void JsonObjectSetInplace( json jObject, string sKey, json jValue);
#### Parameters 

jObject
    Json reference to change 

sKey
    Key to change 

jValue
    Value to change the key to
#### Description
Modifies jObject in-place (with no memory copies of the full object). 
jObject will have the key at sKey set to jValue. 
#### Remarks
This is like JsonObjectSet except it modifies the Json that is referenced by jObject instead of copying jObject then returning it as a new copy of it. 
This means you have to be more careful so don't use this unless you test thoroughly, for instance this works: 
json jArray = JsonArray();// Inserts the jValue into jArrayJsonArrayInsertInplace(jArray, jValue);
This will not work since JsonObjectGet returns a new Json value from some other Json, which then is unreferenced so the change is immediately lost: 
JsonArrayInsertInplace(JsonObjectGet(jObject, "key"), jValue);
You can even modify the target of local variables. This updates the local variable without a SetLocalJson call. This can go very wrong if you are not careful, for instance by making assumptions the Json exists on the object already to be modified. 
// jValue is referenced by the local variable mapped to "jsonQuest" so is modified directly without a SetLocalJson calljson jValue = GetLocalJson(oPC, "jsonQuest");JsonObjectSetInplace(jValue, "name", JsonString("new_name"));// This is a shorter equivalent to the aboveJsonObjectSetInplace(GetLocalJson(oPC, "jsonQuest"), "name", JsonString("new_name"));
#### Version
This function was added in 1.88.8193.36 of NWN:EE. 
#### Example
// Returns a Json object with the data representing lData locationjson LocationToJson(location lData){ json jResult = JsonObject(); object oArea = GetAreaFromLocation(lData); vector vPos = GetPositionFromLocation(lData); float facing = GetFacingFromLocation(lData); json jPos = JsonObject(); // These modify jPos without needing copies to be made JsonObjectSetInplace(jPos, "x", JsonFloat(vPos.x)); JsonObjectSetInplace(jPos, "y", JsonFloat(vPos.y)); JsonObjectSetInplace(jPos, "z", JsonFloat(vPos.z)); // These modify jResult without needing copies to be made JsonObjectSetInplace(jResult, "area", JsonObjectSet(JsonObject(), "resref", JsonString(GetResRef(oArea)))); JsonObjectSetInplace(jResult, "position", jPos); JsonObjectSetInplace(jResult, "facing", JsonFloat(facing)); return jResult;}
#### See Also
functions:  |  JsonObjectSet, JsonObjectDelInplace"), JsonArrayInsertInplace"), JsonArraySetInplace"), JsonArrayDelInplace")
