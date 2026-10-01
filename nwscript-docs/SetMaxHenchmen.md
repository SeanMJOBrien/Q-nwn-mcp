<!-- Source: https://nwnlexicon.com/index.php/SetMaxHenchmen -->

# SetMaxHenchmen(int)
Sets the maximum number of henchmen. 
void SetMaxHenchmen( int nNumHenchmen);
#### Parameters 

nNumHenchmen
    Maximum allowed number of henchmen in module (1 - 100)
### Description
Sets the maximum number of henchmen. The amount can be between 1 and 100, numbers under 1 get capped increased 1 and over 100 get capped to 100. 
This value is only checked when a AddHenchman() call is done; if a PC has 2 henchmen and the setting is lowered to 1, no henchmen will be removed but removing one and trying to re-add it will fail. 
### Remarks
Since Hordes of the Underdark, it has been possible for a PC to have more than one henchman. By default, the max number of henchmen will still be 1, so you must call this function manually, for instance in your OnModuleLoad event, to allow for more than one henchman. 
You can retrieve this number with a simple call of GetMaxHenchmen(). It has no significance apart from the amount of henchmen the game allows you to have, as noted, checked when AddHenchman() is used and has no effect on PC party sizes otherwise. 
### Version
1.62 
### Example
// Example code for On Module Load to make the maximum// number of henchmen 3void main(){ // No parameter other then a number needed SetMaxHenchmen(3); // Thats it!}
### See Also
functions:  | GetMaxHenchmen AddHenchman
