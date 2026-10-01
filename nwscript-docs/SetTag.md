<!-- Source: https://nwnlexicon.com/index.php/SetTag -->

# SetTag(object, string)

Sets a new tag on an object. 
void SetTag( object oObject, string sNewTag);
### Parameters 

oObject
    The object to tag. 

sNewTag
    A new tag for the object.
### Description
Sets a new tag for oObject. Will do nothing for invalid objects or the module object. 
Note: Care needs to be taken with this function. Changing the tag for creature with waypoints will make them stop walking them. Changing waypoint, door, or trigger tags will break their area transitions. 
### Remarks
Tags are up to 63 characters after some testing, however smaller is usually more manageable. Also note CopyObject caps the length of a tag to 32 characters, which is what the toolset usually defines it as, so 32 might be a better "maximum". 
Tags can be made up of alphanumeric characters and underscores. Any other characters are stripped out before the command completes (so SetTag("Hello--Bye", OBJECT_SELF); ends up with the tag "HelloBye"). 
They are case sensitive (Bioware commonly used all uppercase letters for theirs). 
### Version
This function was added in 1.74.8149 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | GetTag, CopyObject, TagEffect
