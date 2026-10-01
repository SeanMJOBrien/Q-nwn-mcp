<!-- Source: https://nwnlexicon.com/index.php?title=JsonArray&amp;action=history -->

# JsonArray()

Create a empty json array. 
json JsonArray();
#### Description
Create a empty json array. 
#### Remarks
You can use this to generate a starting empty array to insert entries into. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
void main(){ // An array example where we get creatures in an area around OBJECT_SELF and sort them by current HP // Then we loop the array to do something to these creatures (for now just a SpeakString). json jArray = JsonArray(); location lTarget = GetLocation(OBJECT_SELF); object oObject = GetFirstObjectInShape(SHAPE_SPHERE, RADIUS_SIZE_LARGE, lTarget, TRUE, OBJECT_TYPE_CREATURE); while (GetIsObjectValid(oObject)) { json jObject = JsonObject(); // Add the value we sort with first so it's part of the sorting later jObject = JsonObjectSet(jObject, "currenthp", JsonInt(GetCurrentHitPoints(oObject))); jObject = JsonObjectSet(jObject, "objectid", JsonString(ObjectToString(oObject))); jArray = JsonArrayInsert(jArray, jObject); oObject = GetNextObjectInShape(SHAPE_SPHERE, RADIUS_SIZE_LARGE, lTarget, TRUE, OBJECT_TYPE_CREATURE); } // Sort the array jArray = JsonArrayTransform(jArray, JSON_ARRAY_SORT_ASCENDING); // Now jArray is sorted we can loop it and use the OIDs we stored int nIndex; for (nIndex = 0; nIndex < JsonGetLength(jArray); nIndex++) { json jObject = JsonArrayGet(jArray, nIndex); // Get the object ID string sOID = JsonGetString(JsonObjectGet(jObject, "objectid")); object oObject = StringToObject(sOID); if (GetIsObjectValid(oObject)) { // Valid object can now do something SpeakString("Creature: " + GetName(oObject) + " has HP: " + IntToString(GetCurrentHitPoints(oObject))); } else { // This error case shouldn't happen! SpeakString("OID is invalid in loop: " + sOID); } }}
#### See Also
functions:  |  JSON Functions
