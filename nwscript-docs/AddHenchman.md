<!-- Source: https://nwnlexicon.com/index.php/AddHenchman -->

# AddHenchman(object, object)
Adds a henchman NPC to a PC. 
void AddHenchman( object oMaster, object oHenchman = OBJECT_SELF);
### Parameters 

oMaster
    The master PC to attach the henchman to. 

oHenchman
    The henchman to attach to oMaster. (Default: OBJECT_SELF)
### Description
Attaches oHenchman as a henchman to oMaster. 
With the new command for HotU, SetMaxHenchmen(), this command can add more then 1 henchmen if the value of GetMaxHenchmen() is, of course, over 1. 
If you have SetMaxHenchmen set too low the game won't let you add a second with some suitable feedback line to the player ("You may only have X henchman/henchmen at a time.") 
### Remarks
This will add a henchman to the PC, but it won't make that NPC act as a henchman. For this to happen, it will need to have henchman scripts attached to its script properties. To attach BioWare's default henchman scripts, go to the scripts tab, press the "load script set" button, and select the henchman-related filename (the name of this may vary according to the expansions you have installed, for me it is called set_xp1_henchmen.ini and I have both expansions installed). 
Note this also seems to call SetAssociateListenPatterns automatically (whether or not it properly is SetListening seems immaterial - those associate listening patterns are "fake" anyway and simply used as an easy message system between the game and the AI scripts). 
Note that the "Remove Henchman" command a PC has access to actually only invokes a special listening pattern, so adding a henchman follower will not mean a PC can remove them unless that listening pattern is responded to. This can be useful for, say, a quick and dirty following plot-quest NPC which you want to stick around. Simply remove it's reaction to that command and they'll be permanent. 
However there is one exception to them being removed that the PCs can control as it were - when a henchman dies they're automatically removed from a party. However you can use this function on dead NPCs (as long as SetIsDestroyable means they are still in the game world and don't disappear!). Do this OnDeath to properly keep them in the PCs party. Bioware used a 0.1 DelayCommand to call it, since the master is still valid OnDeath itself. 
Obviously DestroyObject also removes them from a PCs party too. 
### Version
1.62 
### See Also
functions:  | GetMaxHenchmen, SetMaxHenchmen SetAssociateListenPatterns SetListening
