<!-- Source: https://nwnlexicon.com/index.php/ActionSpeakStringByStrRef -->

# ActionSpeakStringByStrRef(int, int)
Causes the creature to speak a translated string. 
void ActionSpeakStringByStrRef( int nStrRef, int nTalkVolume = TALKVOLUME_TALK);
### Parameters 

nStrRef
    Reference of the string in the talk table 

nTalkVolume
    A TALKVOLUME_* constant representing the channel on which to speak the string. (Default: TALKVOLUME_TALK)
### Description
Causes the calling creature to speak a translated string with the nStrRef index from the Talk Table. 
### Remarks
The StrRef is an index number into the user's dialog.tlk file, which is a language-specific file or the module specific .tlk file. 
Since Hordes of the Underdark, it's become possible to easily make your own tlk file and include with your module. Note that you must add 16777216 to the index in your file, so if you want entry 1 in your custom tlk file, you'll need use 16777217 for the nStrRef in this function. More detailed information on talk tables can be found here. 
### Version
1.62 
### Example
// This is an example OnSpellCastAt event script, in which the NPC will speak// the name of the spell that was cast at him.void main(){ //The spell that triggered this OnSpellCastAt event int nSpell = GetLastSpell(); // Look up the StrRef as a string in spells.2da and convert to int int nStrRef = StringToInt(Get2DAString("spells", "Name", nSpell)); // Speak the spell name ActionSpeakStringByStrRef(nStrRef, TALKVOLUME_SHOUT);}
### See Also
functions:  | ActionSpeakString, FloatingTextStrRefOnCreature, SpeakStringByStrRef  

constants:  | TALKVOLUME_* Constants
