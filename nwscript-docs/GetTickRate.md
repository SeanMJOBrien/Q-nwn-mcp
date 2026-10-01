<!-- Source: https://nwnlexicon.com/index.php/GetTickRate -->

# GetTickRate()

Return the current game tick rate (mainloop iterations per second). 
int GetTickRate();
#### Description
Return the current game tick rate (mainloop iterations per second). This is equivalent to graphics frames per second when the module is running inside a client. 
#### Remarks
60 would be a usual optimal amount to see a game run at. 
You can use this to check the performance of a server or SP game to run "heavier" scripts at better times or just to provide performance debug data. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
functions:  |  DelayCommand() GetMicrosecondCounter() GetScriptInstructionsRemaining()
