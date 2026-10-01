<!-- Source: https://nwnlexicon.com/index.php/GetSpellUsesLeft -->

# GetSpellUsesLeft(object, int, int, int, int)

Gets the amount of uses a spell has left. 
void GetSpellUsesLeft( object oCreature, int nClassType, int nSpellId, int nMetaMagic = METAMAGIC_NONE, int nDomainLevel = 0);
#### Parameters 

oCreature
    The creature for whom to adjust the spell book. 

nClassType
    A CLASS_TYPE_* constant. 

nSpellId
    A SPELL_* constant. 

nMetaMagic
    A METAMAGIC_* constant. 

nDomainLevel
    The domain level, if a domain spell. Use 0 if not a domain spell.
#### Description
Gets the amount of uses a spell has left. 
Returns: the amount of spell uses left (0 on error). 
#### Remarks
As noted domain spells cannot be cantrips (level 0). 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
// In the absence of "GetSpellUsesLeftByLevel()" for Sorcerers and Bards, you can pass in the first spell of a given// level they do have in their known spell list.object oCreature = GetFirstPC();int nSpellLevel = 3;int nSlotUsesLeft = GetSpellUsesLeft(oCreature, CLASS_TYPE_SORCERER, GetKnownSpellId(oCreature, CLASS_TYPE_SORCERER, nSpellLevel, 0));// NB: If they don't have any spells at that level (due to using metamagic to promote a lower spell into the slot) you would have to use checks of metamagic as needed.// NB: For a Sorcerer-style caster with access to every spell as a Cleric has you'd need to tweak this to read through spells.2da and find the relevant spells, or use GetSpellLevelByClass in a loop of all IDs.
#### See Also
functions:  |  GetSpellLevelByClass() GetKnownSpellId  

constants:  |  CLASS_TYPE_* METAMAGIC_* SPELL_*
