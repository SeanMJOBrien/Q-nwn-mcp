<!-- Source: https://nwnlexicon.com/index.php/GetCreatureSize -->

# GetCreatureSize

# GetCreatureSize(object)
Determines the size class of a creature. 
int GetCreatureSize( object oCreature);
#### Parameters
_oCreature_
The creature whose size we are to determine. 
#### Description
Returns the size (CREATURE_SIZE_*) of oCreature. It returns CREATURE_SIZE_INVALID for an invalid size - normally a non-creature. The sizes are defined by the 2da file, creaturesize.2da and referred to in the SIZECATEGORY column of appearance.2da 
#### Remarks
This is determined by the appearance of the creature. A PC who is polymorphed into a dragon will return the CREATURE_SIZE_HUGE, not their normal CREATURE_SIZE_MEDIUM. There is no way to change this apart from changing the appearance.2da file. It also only really affects Knockdown and AC. - it is harder (more penalties) to attack a larger creature, and tiny creatures get a small bonus to AC (+2), small get some (+1), large get a small penalty (-1) and huge gets a small penalty (-2). The AC changes show up in a creatures properties in the toolset. 
#### Version
1.62 
#### Example
// If we are HUGE, we say a huge speakstring main(){ // Check our size if(GetCreatureSize(OBJECT_SELF) == CREATURE_SIZE_HUGE) { // Speak the taunt - Monty Python fans might remember  // this from a certain Archaeologist Height sketch SpeakString("I'm so tall! Ahahhehehehe!"); }}
#### See Also
constants:  |   CREATURE_SIZE_* Constants
