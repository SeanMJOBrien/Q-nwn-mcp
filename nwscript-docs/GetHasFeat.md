<!-- Source: https://nwnlexicon.com/index.php?title=GetHasFeat&amp;action=history -->

# GetHasFeat(int, object)
Test whether a creature has a particular feat and it is usable. 
int GetHasFeat( int nFeat, object oCreature = OBJECT_SELF, int bIgnoreUses = FALSE);
#### Parameters 

nFeat
     FEAT_*  or line ID from feat.2da 

oCreature
    Creature to check for feat. (Default: OBJECT_SELF) 

bIgnoreUses
    Will check if the creature has the given feat even if it has no uses remaining (Default: FALSE)
#### Description
Determine whether oCreature has nFeat, and nFeat is usable. Checks the highest level of a feat. Returns TRUE if oCreature has nFeat and its usable, FALSE otherwise. 
For multiple-use active feats use GetFeatRemainingUses to find out how many uses of a feat remains. 
#### Remarks
The feat doesn't have to be usable to return TRUE, as feats such as Alertness, Simple Weapon Proficiency and so forth can be returned TRUE by this. 
Any feat which stacks - such as bard songs, are got through the base (first) feat acquired for it - such as the first entry of FEAT_BARD_SONGS in feats.2da, or the first entry of FEAT_SNEAK_ATTACK in the same 2da. It'll check for the other feats in the chain. 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. GetHasFeat() now has bIgnoreUses parameter. 
#### Example
// If the PC speaker has the feat "Alertness" then the NPC whispers// "I see you know whats going on around you..."// Goes in a conversation somewhere.void main(){ if(GetHasFeat(FEAT_ALERTNESS, GetPCSpeaker())) { // Speak the whisper SpeakString("I see you know whats going on around you...", TALKVOLUME_WHISPER); }}
#### See Also
constants:  |   FEAT_* Constants
