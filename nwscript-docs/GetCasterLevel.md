<!-- Source: https://nwnlexicon.com/index.php?title=GetCasterLevel&amp;action=history -->

# GetCasterLevel(object)
Determines the level of caster for a creature when casting a spell or Area of Effect when running scripts. 
int GetCasterLevel( object oCreature);
#### Parameters 

oCreature
    Creature or placeable casting a spell or an Area of Effect object
#### Description
Get the Caster Level in a Spell Script or Area of Effect OnEnter, OnExit or OnHeartbeat. If the creature is multiclassed, this function returns the level of the class used to cast the spell. 
This is consistent with the caster level used when applying effects if OBJECT_SELF is used. 
For placeables casting spells they have to cheat spell, which will automatically does caster levels in the range of 10 - 17. Code: min(10, (Innate Spell Level * 2) - 1). 
Return a value of 0 on error. 
#### Remarks
This function only works properly when oCreature is casting a spell. It is certainly the only reliable place. If used outside a spell script, it will return the last caster level of the last spell cast by oCreature - IE, some Area-of-Effect spells do this, to get how much damage dice to use (in EE this can be swapped to checking the AOE itself for the stored caster level). 
You could also use in the OnSpellCastAt reasonably accurately since these are usually queued to fire immediately after the spell script, except for the case of Area of Effects - you'd have to find the AOE that applied the effect which is more difficult (since the effects will come from the parent caster). 
It is affected by EffectNegativeLevel having -1 to the value (so can reach 0, for multi-classed character!) for each negative level applied. 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. EffectDispelMagicAll(), EffectDispelMagicBest() made consistent with new caster level calculations and will always utilize stored caster level of effects. 
This function was updated in 1.88.8193.36 of NWN:EE. Area of Effect objects now consistently store and retrieve their caster level (GetCasterLevel) and spell ID (GetSpellId). Fixed effects incorrectly setting creator, caster level and spell ID. 
#### Example
// Example 1 - Gets the casting level of the object that last cast// a spell, if that object is a PC or Creature. For fun, the object// then says its caster level./* note the bug above; this example may not work properly */void main(){ // Get the object that last cast a spell. object oCreature = GetLastSpellCaster(); // Get out if it is not a creature (PC or mob) if (GetObjectType(oCreature) != OBJECT_TYPE_CREATURE) return; // Get the casting level of the creature. int nCLevel = GetCasterLevel(oCreature); // Just for fun... string sLevel = IntToString(nCLevel); AssignCommand(oCreature,SpeakString("I'm a level " + sLevel + " caster!",TALKVOLUME_TALK));}
#### See Also
functions:  |   GetLastSpellCaster  GetEffectCasterLevel  

events:  |  Spell Script
