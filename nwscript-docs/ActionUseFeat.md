<!-- Source: https://nwnlexicon.com/index.php/ActionUseFeat -->

# ActionUseFeat(int, object)
Causes an creature to use a feat. 
void ActionUseFeat( int nFeat, object oTarget = OBJECT_SELF, int nSubFeat = 0, location lTarget = LOCATION_INVALID);
### Parameters 

nFeat
    The FEAT_* constant representing the feat to use. 

oTarget
    The object to be the target of the feat. Must be OBJECT_INVALID if lTarget is to be used. 

nSubFeat
    Use 0 for no subfeat. For feats with subdial options, use either: SUBFEAT_* for some specific feats like called shot, spells.2da line of the subdial spell, eg 708 for Dragon Shape: Blue Dragon when using FEAT_EPIC_WILD_SHAPE_DRAGON 

lTarget
    The location to use the feat at. oTarget must be OBJECT_INVALID for this to be used.
### Description
ActionUseFeat causes the action subject to use the specified feat on oTarget or at lTarget (if oTarget is an appropriate object type for the feat, feats can target the ground only, not a object). If the creature doesn't have the feat, this action does nothing. 
To target a location make sure to have oTarget be OBJECT_INVALID. 
If both oTarget and the lTarget values are invalid, the feat is queued to be used against the current target the creature is attacking. 
The nSubFeat needs to be a specific SUBFEAT_* value for FEAT_CALLED_SHOT, FEAT_ELEMENTAL_SHAPE and FEAT_WILD_SHAPE. Other feats use the spell ID line in spells.2da, see the code example below. Use 0 in cases with no subfeat. 
Passive feats such as Alertness, Martial Weapon Proficiency, and so on cannot be used, of course. 
### Remarks
There is no way to make a creature use a feat it doesn't know. Unlike in ActionCastSpellAtObject(), there is no "Cheat" option. If the creature knows a feat but has run out of uses, you can use IncrementRemainingFeatUses() to give them more. Contrariwise, you can decrease the number of uses of a feat with DecrementRemainingFeatUses(). 
Combat Feats get an ActionAttack automatically queued so no need to add that on top, while feats that activate a Spell Script such as Turn Undead or Barbarian Rage do not. 
Some combat feats will fail (eg if you try Stunning Fist when not unarmed) in which case it should just add an ActionAttack instead0. 
PCs can have this invoked on them but it will fail for feats that should be activated by SetActionMode() instead, see ACTION_MODE for the complete list. 
While most feats that invoked Spell Scripts to be called just get through, there are some checks and special behaviours worth noting: 
  * Arcane Archer feats check for a longbow or shortbow in the right hand and the action fails if these are not present
  * Druid and Shifter wildshape if activated (apparently possible using the radial) then the current polymorph will be instantly removed before the action starts to allow item merging.
  * If a spell that requires a subspell to be picked is not specified a random choice will be made.
  * The spell data is partially used to validate that a target is needed and valid (ie it's not targeting the ground). This mainly is important for instant feats. (More testing needed)

### Version
This function was updated in 1.87.8193.35 of NWN:EE. Added the nSubFeat and lTarget parameters removing old known bugs that this feat didn't work with subspells or subfeats, nor location targeting feats like FEAT_EPIC_SPELL_MUMMY_DUST. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed ActionUseFeat() with an invalid target to queue a combat feat against the current target the creature is attacking. 
### Example
// In "Actions Taken" script of conversation node from// an NPC with the "Lay on Hands" feat:void main(){ ActionUseFeat(FEAT_LAY_ON_HANDS, GetPCSpeaker());}// Advanced uses of this functionvoid main(){ object oTarget = GetNearestCreature(CREATURE_TYPE_REPUTATION, REPUTATION_TYPE_ENEMY); // Use the Mummy Dust feat at our own location, this feat can't be used on a target object (annoyingly) ActionUseFeat(FEAT_EPIC_SPELL_MUMMY_DUST, OBJECT_INVALID, 0, GetLocation(OBJECT_SELF)); // Use the subfeat Called Shot: Legs against a enemy ActionUseFeat(FEAT_CALLED_SHOT, oTarget, SUBFEAT_CALLED_SHOT_LEG); // Use the subfeat Wyrmling Shape: Black (660, no constant ID) on self ActionUseFeat(FEAT_GREATER_WILDSHAPE_1, OBJECT_SELF, 660);}
### See Also
functions:  | GetHasFeat  

constants:  | FEAT_* Constants
