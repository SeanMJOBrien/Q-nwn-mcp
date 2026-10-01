<!-- Source: https://nwnlexicon.com/index.php/BlackScreen -->

# BlackScreen(object)
Makes the screen go black. 
void BlackScreen( object oCreature);

### Parameters 

oCreature
    Creature controlled by a player that should see the black screen.
### Description
Sets the screen to black. This can be used in preparation for a fade-in effect (FadeFromBlack() function) and can be cleared by calling FadeFromBlack() or calling StopFade(). 
### Remarks
The screen goes black immediately. If you want the screen to go black gradually, use FadeToBlack() instead. 
Unknown if familiars who are specified as oCreature will cause the possessing player's screen to go black when the familiar is possessed. 
### Version
1.30 
### Example
// This script goes in the OnOpen slot for a placeable.// It will cause the screen to go black for any PC who opens it. After 10// seconds, the screen will fade back to normal.void main(){ object oPC = GetLastOpenedBy(); BlackScreen(oPC); DelayCommand(10.0, FadeFromBlack(oPC)); // Alternately, we could make the blackness go away as fast it was applied: // DelayCommand(10.0, StopFade(oPC));}
### See Also
functions:  | FadeToBlack, FadeFromBlack, StopFade
