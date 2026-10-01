<!-- Source: https://nwnlexicon.com/index.php?title=EffectBonusFeat&amp;action=history -->

# EffectBonusFeat(int)

Creates a bonus feat effect. 
effect EffectBonusFeat( int nFeat);
#### Parameters 

nFeat
    The feat to grant as an effect; a feat.2da entry - which can be identified with a FEAT_* constant.
#### Description
Creates a bonus feat effect. These act like the Bonus Feat item property, and do not work as feat prerequisites for levelup purposes. 
#### Remarks
This can be made long-lasting (even through death) with UnyieldingEffect which can remove the need to have hide-applied ItemPropertyBonusFeat and allow feats through EffectPolymorph which alters the items of the creature it is applied to. 
Like bonus feats on items it won't count when levelling up for any prerequisites. 
#### Effect Breakdown
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nFeat - FEAT_* | The bonus feat.   
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  |  FEAT_* Constants
