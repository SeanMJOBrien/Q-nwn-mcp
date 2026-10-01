<!-- Source: https://nwnlexicon.com/index.php?title=JsonObject&amp;action=history -->

# JsonObject()

Create a empty json object. 
json JsonObject();
#### Description
Create a empty json object. 
#### Remarks
Json objects are a type of generic "container" for further Json to reside in. For instance "FeatList" in a creatures ObjectToJson will return JSON_TYPE_OBJECT, since it is a list of further things not a raw type by itself. 
To get items inside the given object use JsonObjectGet or similar functions. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  JSON Functions
