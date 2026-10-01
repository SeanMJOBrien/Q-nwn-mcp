<!-- Source: https://nwnlexicon.com/index.php/ActionCreate -->

# ActionCreate(string, location)
Used to encapsulate CreateObject allowing this function to be added to the action stack. 
void ActionCreate( string sCreature, location lLoc);

### Parameters 

sCreature
    The resref of the creature to create 

lLoc
    The location to create the creature
### Description
This function essentially wraps the CreateObject function in a void method so that it can be placed on the action queue. It is used in the OnHeartbeat of the placeable object "Skeleton Bones" found in the Battlefield palette. 
### Remarks
nw_o2_skeleton.nss might be a good place to start if you wanted objects to turn into creatures when the player approached. 
nw_o2_skeleton cannot be included in a script that has a "void main()" function definition. This is because "nw_o2_skeleton" defines a "void main()" function. If you want to use this function, make a copy from "nw_o2_skeleton" into your own script. 
Note that this function can only create creatures. A more versatile function is CreateObjectVoid. 
### Requirements
#include "nw_o2_skeleton" 
### Version
1.28 
### Example
string sCreature = "NW_SKELWARR01";location lLoc = GetLocation(OBJECT_SELF);DelayCommand(0.3, ActionCreate(sCreature, lLoc));// The DelayCommand message above could be replaced with// ActionDoCommand(ActionCreate(sCreature, lLoc));
### See Also
functions:  | CreateObject  

events:  | OnHeartbeat Event
