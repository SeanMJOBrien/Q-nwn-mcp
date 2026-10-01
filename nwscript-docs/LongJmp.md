<!-- Source: https://nwnlexicon.com/index.php/LongJmp -->

# LongJmp(string, int)

Jump execution back in time to the point where you called SetJmp with the same label. 
void LongJmp( string sLabel, int nRetVal = -1);
#### Parameters 

sLabel
    The label to jump to in the code. 

nRetVal
    The parameter passed to SetJmp, resuming script execution as if SetJmp returned that value (instead of 0).
#### Description
Jump execution back in time to the point where you called SetJmp with the same label. 
  * This function is a GREAT way to get really hard-to-debug stack under/overflows.
  * Will not work across script runs or script recursion; only within the same script. (However, it WILL work across includes - those go into the same script data in compilation)
  * Will throw a script error if sLabel does not exist.
  * Will throw a script error if no valid jump destination exists.
  * You CAN jump to locations with compatible stack layout, including sibling functions. For the script to successfully finish, the entire stack needs to be correct (either in code or by jumping elsewhere again). Making sure this is the case is YOUR responsibility.
  * The parameter nRetVal is passed to SetJmp, resuming script execution as if SetJmp returned that value (instead of 0). If you accidentally pass 0 as nRetVal, it will be silently rewritten to 1. Any other integer value is valid, including negative ones.
  * This call will never return.

#### Remarks
 | This section of the article is a stub. You can help the NWN Lexicon by expanding it.   

#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed LongJmp() incorrectly modifying some passed return values. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  GetIsValidJmp() SetJmp()
