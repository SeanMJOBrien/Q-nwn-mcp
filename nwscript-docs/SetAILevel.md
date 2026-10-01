<!-- Source: https://nwnlexicon.com/index.php/SetAILevel -->

# SetAILevel

# SetAILevel(object, int)
Sets the AI (artificial intelligence) level of a creature. 
void SetAILevel( object oTarget, int nAILevel);
#### Parameters
_oTarget_
Target's AI to affect 
_nAILevel_
AI level to impose (AI_LEVEL_*). 
#### Description
Sets the AI level of a creature. By default, the game will determine the best AI level to use, but by using this function the default value will be overridden. This function does not work on players. Reserve AI_LEVEL_HIGH for special use only as it causes a creature to consume a lot of CPU time. 
#### Remarks
A good thing you can do with this function is to take load off the CPU when doing scripted battles, e.g. for cutscenes. If you set the AI level of most of the creatures very low, and then use a single "commander" to AssignCommand actions to all the different creatures, you can save a lot of CPU time. 
Setting AI_LEVEL_VERY_HIGH or any custom value higher than 3 results into AI_LEVEL_HIGH (3). 
See GetAILevel for further notes on what each AI level means in the context of a game executing scripts. 
#### Version
1.61 
#### See Also
functions:  |   GetAILevel   

constants:  |   AI_LEVEL_* Constants
