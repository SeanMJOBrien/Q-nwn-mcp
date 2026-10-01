<!-- Source: https://nwnlexicon.com/index.php/ActionSit -->

# ActionSit(object)

Causes a creature to attempt to sit on something. 
void ActionSit( object oChair);

### Parameters 

oChair
    Object to sit on (typically a chair or couch).
### Description
Calling object will attempt to sit in or on oChair. oChair represents the target of the script and is usually set to OBJECT_SELF, as the script is usually put on the object's OnUsed event handler. You can only sit on placeable objects. 
Once a creature is sitting on a placeable object, you can retrieve it by GetSittingCreature(). To make a creature stand up from sitting on an object, use ClearAllActions(), although most actions may also cancel it. 
### Remarks
Not all creatures will sit, and not all the placeables will give good results. 
You can use the invisible object placeable to let creatures sit on tileset items. 
When ActionSit is issued, the creature attempts to move to the chair first. Sometimes they spend an unreasonable time trying to find a path. However, GetSittingCreature() does not return a valid object until the creature is actually sitting. Using this fact, the script can check after a couple of seconds that the creature is seated. If not, cancelling ActionSit and reissuing it generally works more reliably. 
On most objects apart from invisible objects, chairs, and couches, the creature always sits facing east (direction 90.0). This is due to the "use01" dummy located close to the model's center (the "use01" dummy is used to determine which direction the sitting creature will face). By modifying the invisible object model in a hak pak (moving the "use01" dummy forward 5 units), the sitting creature will now face the direction the arrow points. Such a hakpak is available on the Vault, courtesy of Tom Aman . 
Invisible objects makes good substitutes, and seem to work without hakpack modifications. You can fit 3 humanoids on a bench (and there are many Vault scripts which let you do this) or you can just use them directly, placed upon parts of terrain. 
### Known Bugs
If a placeable is sat on by a PC who then leaves the module (or sometimes just uses an item), ActionSit() no longer works on the placeable, even if you don't bother to check GetSittingCreature(). 
### Version
1.62 
### Example
// The following script will allow the PC to sit in a chairvoid main(){ object oChair = OBJECT_SELF; object oPlayer = GetLastUsedBy(); if (GetIsPC(oPlayer)) { if (GetIsObjectValid(oChair) && (GetSittingCreature(oChair))) { AssignCommand(oPlayer, ActionSit(oChair)); } }}
### See Also
functions:  | GetSittingCreature
