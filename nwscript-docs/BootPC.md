<!-- Source: https://nwnlexicon.com/index.php?title=BootPC&amp;action=history -->

# BootPC(object, string)
Abruptly kicks a player off a multi-player server. 
void BootPC( object oPlayer, string sReason = "");

### Parameters 

oPlayer
    The PC object of a player to boot. 

sReason
    Optional. Override text to display to the user showing the reason for the boot.
### Description
BootPC does what it sounds like - abruptly kicks a PC out of a multi-player game. The PC gets no option to save. 
 | **Caution:** This section documents changes arising in NWN: Enhanced Edition content. The content is available in both the classic version and the Enhanced Edition of the game. However, the behavior may vary in each version. More details may be available in the NWN Enhanced Edition patch notes.   

As of NWNEE version 8158, this function now takes an optional parameter that allows the scripter to override the message displayed to the player. 
### Remarks
If a PC rejoins immediately, they will start where they left off. BootPC has no effect in single-player mode. 
### Version
1.22 
### Example
// A trigger designed to annoy OnEnter:void main(){ BootPC(GetEnteringObject());}
### See Also
functions:  | GetPCPublicCDKey()
