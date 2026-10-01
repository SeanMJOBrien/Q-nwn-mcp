<!-- Source: https://nwnlexicon.com/index.php?title=HashString&amp;action=history -->

# HashString(string)

Returns the 32bit integer hash of sString. 
int HashString( string sString);
#### Parameters 

sString
    The string from which the hash is calculated.
#### Description
Returns the 32bit integer hash of sString. This hash is stable and will always have the same value for same input string, regardless of platform. 
The hash algorithm is the same as the one used internally for strings in case statements, so you can do: 
switch (HashString(sString)) { case "AAA": HandleAAA(); break; case "BBB": HandleBBB(); break; }
NOTE: The exact algorithm used is XXH32(sString) ^ XXH32(""). This means that HashString("") is 0. 
In 1.89.8193.37 you can also hash strings at compile time, which may be useful: 
int n = h"hello"; // This is a compile time equivalent of int n = HashString("hello");.
#### Remarks
The most useful thing is the ease of having switch statements able to handle strings, for easier code readability, but you can also use this for having database functions do faster comparisons for large bodies of text (eg for detecting changes) or similar cases of using hashes of strings. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
string sString = "AAA"; switch (HashString(sString)) { case "AAA": HandleAAA(); break; // This fires in this example case "BBB": HandleBBB(); break; default : HandleDefault(); break; }
#### See Also
string  
---
