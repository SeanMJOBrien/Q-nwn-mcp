<!-- Source: https://nwnlexicon.com/index.php?title=DestroyObject&amp;action=history -->

# DestroyObject(object, float)
Destroy an object. 
void DestroyObject( object oDestroy, float fDelay = 0.0f);
### Parameters 

oDestroy
    The object to be destroyed 

fDelay
    Delay (in seconds) before object is destroyed. (Default: 0.0f)
### Description
Irrevocably destroys oObject. This will not work on players, modules or areas, and encounters (see Known Bugs) but does work on anything else. 
fDelay causes the destruction of the object to be delayed by the designated number of seconds. The delay parameter should be used rather than enclosing the DestroyObject() call in a DelayCommand(). 
The module will crash if a script tries to destroy something that is in an invalid area - most notably, a DelayCommand() on DestoyObject(), when the object gets moved to Limbo by a DM. 
When an object is destroyed, all information related to it (creator of AOE's, creator of effects, etc) returns OBJECT_INVALID. 
The objects OnDeath event will not fire when destroyed. 
Finally placeables that are destroyed with items left in them will spawn a bodybag. Creatures destroyed won't, and all their inventory will be lost. 
### Remarks
Object destruction occurs after the script that calls it completes. More specifically, the timer for the fDelay parameter starts ticking down when the script that the DestroyObject() function is called from ends. Since the default value for fDelay is zero seconds, this means that calling DestroyObject() without a fDelay parameter makes the object get destroyed immediately at the end of the script's execution. 
If you set an object to be undestroyable (which according to the documentation only affects what happens upon death) the object will also be unaffected by DestroyObject(). Therefore it is important to SetIsDestroyable(TRUE) just before calling DestroyObject() (or, more accurately, sometime before the fDelay interval expires) if you want to force a non-destroyable object to be destroyed. 
The plot flag does not affect whether DestroyObject() works in any way whatsoever. 
Using DestroyObject() in a loop is safe because the objects are not destroyed until after the script ends and therefore also after the loop completes. Creating objects in loops, on the other hand, can be dangerous as they are created immediately and can therefore affect the loop iteration adversely as it is running. If this is the case CreateObject() calls should be delayed so that the objects will not be created until after the loop ends to avoid the problem. 
Some engine functions will use the equivalent of DestroyObject, notably EffectDisappear. 
### Known Bugs
This function will not work on encounters. Instead the best thing to do is use SetEncounterActive. 
### Example
// Destroy the object tagged "Food" in the PC's inventory// It is very useful for removing, from the game, items which are// used in plots - basically, so the PC cannot do the same quest again.void main(){ object oFood = GetItemPossessedBy(GetPCSpeaker(), "Food"); // Destroy it DestroyObject(oFood);}
### See Also
functions:  | ActionUnequipItem
