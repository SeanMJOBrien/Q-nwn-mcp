<!-- Source: https://nwnlexicon.com/index.php?title=GetIsPlayerConnectionRelayed&amp;action=history -->

# GetIsPlayerConnectionRelayed(object)

Gets whether the player is connected over a relay (instead of directly). 
int GetIsPlayerConnectionRelayed( object oPlayer);

### Parameters 

oPlayer
    The PC whose player should be checked.
### Description
Get if oPlayer is currently connected over a relay (instead of directly). Returns FALSE for any other object, including OBJECT_INVALID. 
### Remarks
According to Beamdog: 
> We added experimental support to carry your connection over authenticated relays, hosted on our end. This is fully automatic and transparent for both players (a relay connection will be chosen if all other attempts fail) and server hosts (servers and scripting will still “see” the actual client IP), and is meant to take care of all remaining connection issues that cannot be handled with UDP hole punching.
### Version
This function was added in 1.74.8162 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.
