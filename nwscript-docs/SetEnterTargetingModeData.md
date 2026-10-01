<!-- Source: https://nwnlexicon.com/index.php/SetEnterTargetingModeData -->

# SetEnterTargetingModeData(object, int, float, float, int, float, int, int)

Sets the spell targeting data which is used for the next call to EnterTargetingMode() for this player. 
void SetEnterTargetingModeData( object oPlayer, int nShape, float fSizeX, float fSizeY, int nFlags, float fRange = 0.0f, int nSpell = -1, int nFeat = -1);
#### Parameters 

oPlayer
    The player to whom targeting mode data is applied. 

nShape
    A SPELL_TARGETING_SHAPE_* constant. 

fSizeX
    A dimension related to the specified SPELL_TARGETING_SHAPE_* constant, see description for details. 

fSizeY
    A dimension related to the specified SPELL_TARGETING_SHAPE_* constant, see description for details. 

nFlags
    A  SPELL_TARGETING_FLAGS_* constant. 

fRange = 0.0f
    The range to use for targeting 

nSpell = -1
    A SPELL_* "Spell \(constant group\)") constant optional, passed to the shader but does nothing by default, you need to edit the shader to use it 

nFeat = -1
    A FEAT_* constant optional, passed to the shader but does nothing by default, you need to edit the shader to use it
#### Description
Sets the spell targeting data which is used for the next call to EnterTargetingMode() for this player. If the shape is set to SPELL_TARGETING_SHAPE_NONE and the range is provided, the dotted line range indicator will still appear. 
fSizeX value needed: 
  * Cone - length
  * hsphere - hollowed radius
  * rectangle - length
  * sphere - radius

fSizeY value needed: 
  * Cone - unused
  * hsphere - end radius
  * rectangle - width
  * sphere - unused

#### Remarks
This can be used to emulate selecting a spell to cast. This would be most useful in two cases; 
  * NUI panel selected spells to provide access to the same targeting GUI that the quickbar has
  * Access to what would be otherwise unavailable spells for the player to cast (by using the bCheat parameter of ActionCastSpellAtObject) in a clean and intuitive way to match base game spell selection.

#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  | SPELL_* constants "Spell \(constant group\)") FEAT_* constants  SPELL_TARGETING_SHAPE_* Constants   SPELL_TARGETING_FLAGS_* Constants   

functions:  |  SetSpellTargetingData()
