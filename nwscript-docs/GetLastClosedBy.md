<!-- Source: https://nwnlexicon.com/index.php/GetLastClosedBy -->

# GetLastClosedBy

# GetLastClosedBy()
Determine which creature closed a door or placeable. 
object GetLastClosedBy();
#### Description
Use this in an OnClose script to get the object that last closed the door or placeable. Returns the creature that last closed the door or placeable. Returns OBJECT_INVALID if the caller is not a valid door or placeable. 
#### Remarks
This function should only be called from the OnClose event script of a door or placeable object. Otherwise it will always return OBJECT_INVALID. But, as of 1.62, the GetLastClosedBy() scripting command now works in the OnStoreClosed event of stores. 
#### Version
1.22 
#### See Also
events:  |   OnClose Event
