<!-- Source: https://nwnlexicon.com/index.php/GetIsPlayerDM -->

# GetIsPlayerDM(object)

Returns TRUE if the given player-controlled creature has DM privileges gained through a player login (as opposed to the DM client). 
int GetIsPlayerDM( object oCreature);
### Parameters 

oCreature
    The creature to check for DM status.
### Description
Returns TRUE if the given player-controlled creature has DM privileges gained through a player login (as opposed to the DM client). 
Note: GetIsDM() also returns TRUE for player creature DMs. 
### Remarks
Player DMs can occur when they enter the DM password into the relevant console commands. 
Player DMs differ from "true" DMs in a few ways, such as not having maximised skills and not being part of the full "DM" faction that allows visibility of all attack rolls. Other differences may be documented later. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | GetIsDM() GetIsDMPossessed() GetIsPC() GetIsPlayerCharacter()
