<!-- Source: https://nwnlexicon.com/index.php/SetSpellTargetingData -->

# SetSpellTargetingData(object, int, int, float, float, int)

Sets the spell targeting data manually for the player. This data is usually specified in spells.2da. 
void SetSpellTargetingData( object oPlayer, int nSpell, int nShape, float fSizeX, float fSizeY, int nFlags);
#### Parameters 

oPlayer
    The player to whom spell targeting data is applied. 

nSpell
    The spell id for which targeting data is specified, typically a SPELL_* "Spell \(constant group\)") constant. 

nShape
    A SPELL_TARGETING_SHAPE_* constant. 

fSizeX
    A dimension related to the specified SPELL_TARGETING_SHAPE_* constant, see description for uses 

fSizeY
    A dimension related to the specified SPELL_TARGETING_SHAPE_* constant, see description for uses 

nFlags
    One or more  SPELL_TARGETING_FLAGS_* constants. These are bitwise flags, eg for a spell that harms allies, except yourself, use `SPELL_TARGETING_FLAGS_HARMS_ALLIES | SPELL_TARGETING_FLAGS_IGNORES_SELF`
#### Description
Sets the spell targeting data manually for the player. This data is usually specified in spells.2da. This data persists through spell casts; you're overwriting the entry in spells.2da for this session. In multiplayer, these need to be reapplied when a player rejoins. 
For fSizeX the value should be: 
  * Cone - length
  * hsphere - hollowed radius
  * rectangle - length
  * sphere - radius

For fSizeY the value should be: 
  * Cone - unused
  * hsphere - end radius
  * rectangle - width
  * sphere - unused

NB: hsphere is "hollow sphere" or a donut, mainly used for Meteor Swarm. 
#### Remarks
This is useful for altering some of the parameters based on Metamagic, Feats or Abilities a PC has. For instance maybe your Fireball that would be cast has Sculpt Metamagic so doesn't affect allies, thus alter SPELL_TARGETING_FLAGS 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  |  SPELL_* Constants  "Spell \(constant group\)")  SPELL_TARGETING_SHAPE_* Constants   SPELL_TARGETING_FLAGS_* Constants   

functions:  |  SetEnterTargetingModeData()
