<!-- Source: https://nwnlexicon.com/index.php?title=GetScriptInstructionsRemaining&amp;action=history -->

# GetScriptInstructionsRemaining()

Returns the number of script instructions remaining for the currently-running script. 
void GetScriptInstructionsRemaining();
#### Description
Returns the number of script instructions remaining for the currently-running script. 
Once this value hits zero, the script will abort with TOO MANY INSTRUCTIONS. 
The instruction limit is configurable by the user, so if you have a really long-running process, this value can guide you with splitting it up into smaller, discretely schedulable parts. 
Note: Running this command and checking/handling the value also takes up some instructions. 
#### Remarks
To get an idea of the current instruction limit run this as the first command in a script. 
The number of instructions is _not_ fully equivalent to the speed of the functions but sometimes is as good as you'll get in some cases, and thus help with debugging / optimising in complex code. 
However apart from debugging, this is primarily aimed at script that abort early with TMI errors: 
  * OnModuleLoad initialising lots of things the module needs
  * Loop large amounts of data (eg; reading 2da files, long SQLite statements)
  * Generating lots of complex objects using json
  * Generating areas and their contents (procedural generation from scratch with json or with CopyArea)

To start a new iteration of the current script you need to use DelayCommand combined with ExecuteScript, likely with a time of 0.0 so it runs as soon as possible, and store were you got to using local variables. 
**Note:** having a 0.0 DelayCommand can cause the game/server to hang while it keeps executing scripts and not letting the game loop run. In a singleplayer module this should be used sparingly likely only at the first loading of the module, and staggered runs of long scripts be done later when the player is moving around to limit lag. 
If you are unsure how long a certain loop you need to run takes run this before it starts and after 1 loop has completed and write the output somewhere safe such as the game log. Alternatively simply start a new iteration when there is something like 10% of the remaining instructions from the start of a loop left. 
It is not recommended to use this for what should be events that are meant to end relatively quickly, eg spell scripts or frequently run events like OnPerception or OnHeartbeat. 
#### Version
This function was added in 1.86.8193.34 of NWN:EE. 
#### Example
// Find out the current instruction limit of a module.// In NWN:EE this returns 524285, slightly shy of the default limit 524288 (so 3 instructions difference).// NOTE: This limit may change dynamically in singleplayer (client can alter in the game options) or multiplayer (using NWNX)void main(){ int nInstructions = GetScriptInstructionsRemaining(); SendMessageToPC(GetFirstPC(), "Instructions remaining: " + IntToString(nInstructions));}
#### See Also
functions:  |  DelayCommand() GetMicrosecondCounter() GetTickRate()   

events:  |  OnModuleLoad
