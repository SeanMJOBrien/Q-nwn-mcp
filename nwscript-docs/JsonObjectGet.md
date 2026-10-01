<!-- Source: https://nwnlexicon.com/index.php?title=JsonObjectGet&amp;action=history -->

# JsonObjectGet(json, string)

Returns the key value of sKey on the object jObject. 
json JsonObjectGet( json jObject, string sKey);
### Parameters 

jObject
    The json Object to query. 

sKey
    The key to query for a value.
#### Description
Returns the key value of sKey on the object jObject. 
#### Remarks
Returns a null json value if jObject is not a object or sKey does not exist on the object, with JsonGetError filled in. 
Appears to run in O(1) time, so execution time remains the same as the object size increases. 
However, note that this appears to be slower on its own than JsonArrayGet(). In testing, Using JsonObjectGet in large loops (hundreds of objects) took several seconds to execute, while JsonArrayGet() was nearly instant. Where possible, make use of JsonArray() objects if you intend to query data in large loops. 
In Short: 
  * Use JsonObject() when you need to be able to retrieve single elements quickly, without looping the entire object.
  * Use JsonArray() when you need to be able to loop through all the contents of the object frequently.
  * If you need to retrieve a lot of object values in large loops, look for a way to use JsonArray() for its superior speed.

#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
A simple example of how to create an object and get its result using JsonObjectGet. 
void main(){ object oPC = OBJECT_SELF; int nSpellId = 1; json jMyObject = JsonObject(); jMyObject = JsonObjectSet(jMyObject, "spellid", JsonInt(nSpellId)); jMyObject = JsonObjectSet(jMyObject, "playerid", JsonString(GetObjectUUID(oPC))); // You can store this JSON object with Get/SetLocalJson and retrieve it later. int nSavedSpellId = JsonGetInt(JsonObjectGet(jMyObject, "spellid"));}
#### Loop Example
If you want to loop through all the elements of an object, you can use JsonObjectKeys(): 
void main(){ json jMyObject = GetLocalJson(GetModule(), "saved_json"); // Make sure we're dealing with a JsonObject() if (JsonGetType(jMyObject) != JSON_TYPE_OBJECT) { return; } json jMyObjectKeys = JsonObjectKeys(jMyObject); int nLength = JsonGetLength(jMyObjectKeys); json jObjectElement; int i, nSpellId; string sKey; // Note that this can be inefficient, as JsonObjectGet is increasingly expensive for larger objects // This loop may take seconds with a large enough object. // For larger objects and loops, find a way to convert this to a JsonArray() if possible. for (i = 0; i<nLength; ++i) { sKey = JsonGetString(JsonArrayGet(jMyObjectKeys, i)); jObjectElement = JsonObjectGet(jMyObject, sKey); // Do something with the object element // ... }}
#### See Also
functions:  |  JSON Functions, JsonObjectSet
