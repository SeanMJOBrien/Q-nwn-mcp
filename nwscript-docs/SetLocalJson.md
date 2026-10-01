<!-- Source: https://nwnlexicon.com/index.php?title=SetLocalJson&amp;action=history -->

# SetLocalJson(object, string, json)

Set oObject's local json variable sVarName to jValue. 
void SetLocalJson( object oObject, string sVarName, json jValue);
### Parameters 

oObject
    object to write a json variable to 

sVarName
    json variable name to write 

jValue
    json variable data to write
#### Description
Set oObject's local json variable sVarName to jValue. 
#### Remarks
Like SetLocalObject this stores a reference to the given Json in memory, rather than copying items around each time like SetLocalString. 
However be aware if you do ObjectToJson with the save state enabled, it'll dump all the Json in those variables to the resulting Json (hint: don't do this unless you have to!). 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
