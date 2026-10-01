<!-- Source: https://nwnlexicon.com/index.php?title=SetJmp&amp;action=history -->

# SetJmp(string)

Mark the current location in code as a jump target, identified by sLabel. 
int SetJmp( string sLabel);
#### Parameters 

sLabel
    The label to apply to the current location in the code.
#### Description
Mark the current location in code as a jump target, identified by sLabel. 
  * Returns 0 on initial invocation, but will return nRetVal if jumped-to by LongJmp.
  * sLabel can be any valid string (including empty); though it is recommended to pick something distinct. The responsibility of namespacing lies with you.
  * Calling repeatedly with the same label will overwrite the previous jump location. If you want to nest them, you need to manage nesting state externally.

#### Remarks
 | This section of the article is a stub. You can help the NWN Lexicon by expanding it.   

#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  GetIsValidJmp() LongJmp()
