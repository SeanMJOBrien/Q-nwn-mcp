<!-- Source: https://nwnlexicon.com/index.php/GetHasSpellEffect -->

# GetHasSpellEffect

# GetHasSpellEffect(int, object)
Determines whether an object is under the effects of a spell. 
int GetHasSpellEffect( int nSpell, object oObject = OBJECT_SELF);
#### Parameters
_nSpell_
 SPELL_* 
_oObject_
The object to investigate. (Default: OBJECT_SELF) 
#### Description
Returns TRUE if oObject has effects originating from nSpell, otherwise FALSE. Only temporary and permanent effects will ever be on a creature for this to pick up, of course. 
#### Remarks
Can be used to see if a spell is active on a creature to avoid from casting the same buff spell on the target. It should be exactly the same, but faster, as if you did a loop of effects on the object with GetFirstEffect() and GetNextEffect(), and checking nSpell against GetEffectSpellId(). Spell files which apply an effect in a DelayCommand(), will not be picked up by this, because the effect wasn't applied at the exact time the spell script was run (according to Bioware). Further testing by Jasperre might point to this being false, and a small delay will not affect the application of spell's effects (they do stack) nor if they are picked up by this. If a delay of an ExecuteScript() or the use of AssignCommand() might well make it unable to be picked up by the function however. nSpell doesn't have to be a spell. Any feat-like ability with a spell entry should have a valid value to put into this. nSpell can also be a monster ability (such as an aura). 
#### Version
1.62 
#### Example
// If the creature has the effect of SPELL_ELEMENTAL_SHIELD,// then the script will tell the user.void main(){ // Get the object object oCreature = GetLastUsedBy(); // Check the spell if(GetHasSpellEffect(SPELL_ELEMENTAL_SHIELD, oCreature)) { // Horrible and Witty (or lack of) comment displayed SpeakString("You're radiantly hot! I wouldn't like to touch you on a day like today!"); }}
#### See Also
constants:  |   SPELL_* Constants
