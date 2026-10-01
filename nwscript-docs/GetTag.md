<!-- Source: https://nwnlexicon.com/index.php/GetTag -->

# GetTag(object)
Determine the tag associated with an object. 
string GetTag( object oObject);
#### Parameters     oObject 

Target object.

#### Description
Returns the tag of oObject. Returns an empty string if oObject is not a valid object. 
PC's do return a valid value - an empty string! This is because they have no string defined as their tag (Even GetObjectByTag("") may return a PC object). You can alter a PCs tag (which is saved to their BIC) with SetTag. 
#### Remarks
This is probably one of the most-used and dynamic functions - by changing a creature/waypoint/objects tag, you can use it for many things, from executing scripts (On Item Activate, execute the item's tag, as a script), to checking if there is "HEY" in the tag, and if so, doing something special. The string manipulators are useful for this. 
The main thing this is used for is to check if an object is exactly something, or if a script is executed, checking what the object running it is. 
Tags are up to 63 characters after some testing, however smaller is usually more manageable. Also note CopyObject caps the length of a tag to 32 characters, which is what the toolset usually defines it as, so 32 might be a better "maximum". 
Tags can be made up of alphanumeric characters and underscores. Any other characters are stripped out before the command completes (so SetTag("Hello--Bye", OBJECT_SELF); ends up with the tag "HelloBye"). 
They are case sensitive (Bioware commonly used all uppercase letters for theirs). 
CreateObject and CopyObject can change a created object's tag (up to 32 characters) or you can use SetTag (up to 63 characters). 
#### Version
1.22 
#### Example
// 1. Get our tag, then the first object by our tag - this should be// ourselves if there is no one else with our tag in existence.void main(){ string sTag = GetTag(OBJECT_SELF); object oSelf = GetObjectByTag(sTag);}// 2. In the OnItemActivate script, we run a script of // "ACT_" + Tag Of Item.void main(){ string sTag = GetTag(GetItemActivated()); // Execute it on the module instantly - the old GetItem calls will // still be valid for this item ExecuteScript("ACT_" + sTag, OBJECT_SELF);}
#### See Also
functions:  |  LocationToString, SetTag, CreateObject, CopyObject
