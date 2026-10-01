<!-- Source: https://nwnlexicon.com/index.php?title=SetIsDestroyable&amp;action=history -->

# SetIsDestroyable(int, int, int)
Sets whether an object is destroyable. 
void SetIsDestroyable( int bDestroyable, int bRaiseable = TRUE, int bSelectableWhenDead = FALSE, object oObject = OBJECT_SELF);
### Parameters 

bDestroyable
    If this is FALSE, the caller does not fade out on death, but sticks around as a corpse. 

bRaiseable
    If this is TRUE, the caller can be raised via resurrection. (Default: TRUE) 

bSelectableWhenDead
    If this is TRUE, the caller is selectable after death. (Default: FALSE) 

oObject
    Object to affect (Default: OBJECT_SELF).
### Description
Sets the destroyable status of oObject. 
If bDestroyable is FALSE, the body does not fade away and the corpse is left; otherwise the body fades away. This can affect placeable objects but mainly in respect to how DestroyObject works on them, see Remarks. 
If bRaiseable is TRUE the body of this function can be raised via resurrection. Creatures only. 
If bSelectableWhenDead is TRUE, then when the body is dead, players when moving their mouse over the corpse will see the name of the creature. Creatures only. 
You can retrieve the current settings of these with GetIsDestroyable"), GetIsRaiseable") and GetIsSelectableWhenDead"). 
### Remarks
A creatures default state if not set in the toolset or elsewhere is Destroyable = TRUE, Raiseable = TRUE and Selectable when dead = FALSE. 
If bSelectableWhenDead is set to TRUE, it does not mean that the corpse will be lootable by clicking on it to see its inventory; you need to use SetLootable alongside this. 
If you set bDestroyable to TRUE on an already dead creature, they get automatically destroyed ala DestroyObject() in 3 seconds. 
Also note that it must be assigned to a target, since it has no parameter to specify a target. There is also no way to check if they are destroyable. 
If you set an object to be undestroyable (which, according to the documentation, only affects what happens upon death) the object will also be unaffected by DestroyObject(). It is therefore important to only set SetIsDestroyable(TRUE) at the moment of the object's death (eg OnDeath) since some spells use DestroyObject. 
### Version
This function was updated in 1.89.8193.37 of NWN:EE. VM: Added SetIsDestroyable() oObject parameter to target a specific object. 
### Example
// In the OnSpawn of a creature - this makes them, basically,// eyecandy and will make them undestroyable and kill them.// - It won't be selectable or raiseable either.void main(){ object oSelf = OBJECT_SELF; // Set to Undestroyable, unraiseable, unselectable SetIsDestroyable(FALSE, FALSE, FALSE); // Apply a death effect as so we die effect eDeath = EffectDeath(); ApplyEffectToObject(DURATION_TYPE_INSTANT, eDeath, oSelf);}
### See Also
functions:  |  SetLootable GetLootable GetIsDestroyable") GetIsRaiseable") GetIsSelectableWhenDead")
