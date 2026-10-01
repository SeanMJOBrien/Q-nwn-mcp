<!-- Source: https://nwnlexicon.com/index.php/GetScriptBacktrace -->

# GetScriptBacktrace(int)

Generate a VM debug view into the current execution location. 
json GetScriptBacktrace( int bIncludeStack = TRUE );
#### Parameters 

bIncludeStack
    Include stack info in the output, if TRUE.
#### Description
Generate a VM debug view into the current execution location. 
  * Names and symbols can only be resolved if debug information is available (NDB file).
  * This call can be a slow call for large scripts.
  * Setting bIncludeStack = TRUE will include stack info in the output, which could be a lot of data for large scripts. You can turn it off if you do not need the info.

Returned data format (JSON object): 
  * "frames": array of stack frames: 
    * "ip": instruction pointer into code
    * "bp", "sp": current base/stack pointer
    * "file", "line", "function": available only if NDB loaded correctly
  * "stack": abbreviated stack data (only if bIncludeStack is TRUE) 
    * "type": one of the nwscript object types, OR:
    * "type_unknown": hex code of AUX
    * "data": type-specific payload. Not all type info is rendered in the interest of brevity. Only enough for you to re-identify which variable this might belong to.

#### Remarks
 | This section of the article is a stub. You can help the NWN Lexicon by expanding it.   

#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
