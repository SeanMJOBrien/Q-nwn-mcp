<!-- Source: https://nwnlexicon.com/index.php?title=AbortRunningScript&amp;action=history -->

# AbortRunningScript(string)

This immediately aborts the running script. 
void AbortRunningScript( string sError = "");
#### Parameters 

sError
    The error message to emit.
#### Description
This immediately aborts the running script. 
  * Will not emit an error to the server log by default.
  * You can specify the optional sError to emit as a script error, which will be printed to the log and sent to all players, just like any other script error.
  * Will not terminate other script recursion (e.g. nested ExecuteScript()) will resume as if the called script exited cleanly.
  * This call will never return.

#### Remarks
Use this to really hard-kill a script in error, similar to forcing an assert in C++. Useful for debugging or catching very big errors. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also  
---
