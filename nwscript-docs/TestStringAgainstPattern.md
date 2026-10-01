<!-- Source: https://nwnlexicon.com/index.php/TestStringAgainstPattern -->

# TestStringAgainstPattern

# TestStringAgainstPattern(string, string)
Returns whether or not the given text matches the pattern. 
int TestStringAgainstPattern( string sPattern, string sStringToTest);
#### Parameters
_sPattern_
A string that represents the pattern to look for (for details look at the Remarks section). 
_sStringToTest_
The string that will be checked for the pattern. 
#### Description
Returns TRUE if sStringToTest matches sPattern, otherwise FALSE. 
#### Remarks
From Noel (Bioware): ** will match zero or more characters *w one or more whitespace *n one or more numeric *p one or more punctuation *a one or more alphabetic | is or ( and ) can be used for blocks - setting a creature to listen for "**" will match any string - telling him to listen for "**funk**" will match any string that contains the word "funk". - "**(bash|open|unlock)**(chest|door)" will match strings like "open the door please" or "he just bashed that chest!" 
#### Known Bugs
Do not test for this: if (TestStringAgainstPattern("**/**", ANY STRING)) It will hang the Toolset, forcing you to shut it down by external means. And if you then reopen the Toolset, say that you want to restore the unsaved module, and go to edit that script, it will hang your Toolset once again. BioWare has been informed of this. Both "/**" and "**/" are okay, though, it's just the "**/**" that should be avoided. 
Important issue (NEW) 
When you use: if (TestStringAgainstPattern(sString1, sString2)) 
sString1 or sString2 contains () NWN goes into Segmentation Fault. The parentheses have to be togheter. This is one of the motivations for which PW could crash. 
Example: -> Detect a keyword in Chat channel -> Use TestStringAgainstPattern to detect if the keyworld "Hello" has been pronounced. -> If the player writes: Hello(), the server/NWN crashes. -> If the player writes: (Hello), no crash occurs. 
 | **Caution:** This section documents changes arising in NWN: Enhanced Edition content. The content is available in both the classic version and the Enhanced Edition of the game. However, the behavior may vary in each version. More details may be available in the NWN Enhanced Edition patch notes.   

This bug is no longer present in NWN:EE. 
#### Version
1.61 
#### Example
//Return TRUE in a conversation if a PC has an item with//TOKEN as part of its tag. Will return TRUE for, eg://TOKEN, TOKENIZER, THETOKEN, THETOKENIZER//Note, it might be easier to use FindSubString for this...int StartingConditional(){object oPC=GetPCSpeaker();object oItem=GetFirstItemInInventory(oPC);while (GetIsObjectValid(oItem)) { if (TestStringAgainstPattern("**TOKEN**", GetTag(oItem))) return TRUE; oItem=GetNextItemInInventory(oPC); }return FALSE;}
#### See Also
functions:  |   FindSubString
