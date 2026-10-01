<!-- Source: https://nwnlexicon.com/index.php/GetStringByStrRef -->

# GetStringByStrRef(int, int)
Determines translated string by string reference. 
string GetStringByStrRef( int nStrRef, int nGender = GENDER_MALE);
#### Parameters 

nStrRef
    Target string reference. 

nGender
    Gender of the string for some languages (Default:  GENDER_MALE )
#### Description
Returns a translated string from the talk table using the string reference indicated by nStrRef. 
If used on the a server it will return the servers language selection, not a clients. A player hosting a module for another to join will use it's language selection. 
#### Remarks
The talk table is a list of strings local to the user's language, so the obtained string will be in, for instance, German on a German installation of Neverwinter Nights. 
Since Hordes of the Underdark, it's become possible to easily make your own tlk file and include with your module. Note that you must add 16777216 to the index in your file, so if you want entry 1 in your custom tlk file, you'll need use 16777217 for the nStrRef in this function. More detailed information on talktables can be found here. 
With patch 1.31, a gender option has been added to the function, with a default value of GENDER_MALE. This is useful as some languages will have different strings depending on the gender of the speaker. It is unknown if providing a GENDER_FEMALE value for a language which doesn't support that will provide the same result as with GENDER_MALE, or if the function errors. 
Previous versions of the Lexicon listed that a list of constants could be used for nStrRef. This is incorrect, though you can of course use constants instead of the actual integer values. 
#### Version
1.62 
#### Example
// Function to get the name of a spellstring GetSpellName(int nSpell){ // Look up the StrRef as a string in spells.2da string sStrRef = Get2DAString("spells", "Name", nSpell); // Convert to an integer int nStrRef = StringToInt(sStrRef); // Look up the name in the dialog.tlk file string sName = GetStringByStrRef(nStrRef); // return the spell's name return sName;}// Example of using the function abovevoid main(){ // The spell that triggered this OnSpellCastAt event int nSpell = GetLastSpell(); string sName = GetSpellName(nSpell); // I'm so funny SpeakString("Don't you dare cast "+sName+" at me!!!"); ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectDeath(), GetLastSpellCaster());}
#### See Also
constants:  |   GENDER_* Constants
