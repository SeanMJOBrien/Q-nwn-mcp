<!-- Source: https://nwnlexicon.com/index.php/AddToParty -->

# AddToParty(object, object)
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

Adds a PC to the party of another PC. 
void AddToParty( object oPC, object oPartyLeader);

### Parameters 

oPC
    Player to add to a party 

oPartyLeader
    Player already in the party
### Description
Add oPC to oPartyLeader's party. Both the oPC and oPartyLeader must be valid PCs for this function to work properly. 
### Remarks
To have an NPC serve a PC use AddHenchman(). 
### Version
1.22 
### See Also
functions:  | RemoveFromParty
