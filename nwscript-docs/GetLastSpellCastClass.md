<!-- Source: https://nwnlexicon.com/index.php?title=GetLastSpellCastClass&amp;action=history -->

# GetLastSpellCastClass()
Returns the class that the spellcaster cast the spell as. 
int GetLastSpellCastClass();
#### Description
Returns the class that the spellcaster (OBJECT_SELF in a called spell script) cast the spell as in the Spell Script or Area of Effect OnEnter, OnExit and OnHeartbeat scripts. 
It will return CLASS_TYPE_INVALID for: 
  * Creature spells and special abilities
  * Any ActionCastSpellXXX() with the bCheat parameter TRUE (which will always be the case for placeables), even if they have the spell already.
  * Any "spell" script fired by a feat (Epic spells, barbarian rage ETC).
  * Items cast from spells the _first_ time they are used. See Known Bugs.

#### Remarks
Very useful function as there didn't use to be any reliable way of telling which class an object used to cast a spell. 
It is only to be used in a spell script for spells which are castable by PC's, or at least, that is the only useful place. Also, by definition, the class level will be adequate to cast this spell. 
#### Known bugs
The result of this function doesn't change (remain previous value of last spell cast) in case the spell is cast from an item. It is recommended to use GetSpellCastItem to check for this before assuming this works. 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. GetLastSpellCastClass() now returns the AOE creator's class in AOE scripts. 
#### Example
// If the last class to cast this spell is a cleric, speak the clerics Deity.// As OBJECT_SELF is the caster, the caster will speak it.void main(){ // Get caster class if(GetLastSpellCastClass() == CLASS_TYPE_CLERIC) { // Speak the string SpeakString("I do this for " + GetDeity(OBJECT_SELF) + "!"); }}
#### See Also
constants:  |   CLASS_TYPE_* Constants   

events:  |  Spell Script
