<!-- Source: https://nwnlexicon.com/index.php?title=SetTlkOverride&amp;action=history -->

# SetTlkOverride(int, string)

Overrides a given string reference so something else is shown. 
void SetTlkOverride( int nStrRef, string sValue="");
### Parameters 

nStrRef
    String reference to replace 

sValue
    String to use, if blank it resets it to default (default: "")
### Description
Overrides a given strref to always return sValue instead of what is in the TLK file. This can be both value from dialog.tlk and custom TLK file. 
Setting sValue to "" will delete the override 
You can use GetStringByStrRef to get what is currently reported by that nStrRef ID. It returns the overriden string if it has already been altered. 
You can insert colour tokens into TLK strings. There are two main methods to do this: 
  * Using a <CUSTOM100> style token with SetCustomToken, eg: <CUSTOM100>Colors!<CUSTOM101> where 100 and 101 are set up as <c123> and </c>
  * Add an additional < so it is not interpreted as a <CUSTOMxxx> token, for instance `<<c«ÿ+>Colors!<</c>`

### Remarks
This is amazing for replacing hardcoded TLK lines; in game feedback, formatting of messages if you've altered rules. You could even replace specific messages in specific circumstances - see example. If the game requests a <CUSTOM0> or similar in the original string this may include additional formatting (eg colouring for EffectDamage messages). 
Note that this does increase network bandwidth; the entire string is sent instead of a single number to look up in the local TLK files. Thus don't use this to generate an entire TLK! Only use it to replace things that are entirely hardcoded or that have to be changed dynamically for some reason. 
Character generation also fires after OnModuleLoad in singleplayer so you can change TLK strings related to the otherwise hardcoded parts (eg; mentions of "Realms" in the gender description, when your world is "The land of Dragons!" or somesuch). This is much safer than altering GUI files. For multiplayer this loads too late - after character select - so use NWNX or alter the TLK references where you can as needed. 
This won't work for chargen in multiplayer apparently since the "these are all the TLK overrides the server has set so far" message comes after chargen. There is some tweaks available in NWNX if you run your server with it to enable chargen tlk lines to take effect. 
A sample of lines you might want to override are available here and what TLK files are here. 
Since a blank string will delete the override, use a space or a blank string in color codes to blank it entirely - however the game still uses a new line character so a blank line will appear in the chat log. 
// Space string sSpace = " ";// Blank character - but has colour code values so is valid for overridestring sBlank = "<c123></c>";
Some events directly precede the feedback message - such as OnFailToOpen in the example below - but this might not always be the case. If you only want some temporary feedback changes like this see the example for a single door that feeds back a better message than "This door is locked.". 
### Version
This function was added in 1.83.8193.21 of NWN:EE. 
### Example
// Sample OnFailToOpen we replace the message just for this door by resetting it afterwardsvoid main(){ SetTlkOverride(8296, "This is locked and has no keyhole. Maybe a mechanism nearby will open it."); // Reset to default for all other doors. Must be longer than 0.0 (so the engine can send that string before we reset it) so we use 0.1. DelayCommand(0.1, SetTlkOverride(8296));}
// The OnModuleLoad loads before character generation so you can replace some strings to be more relevant for your worldvoid main(){ // This is the same except "Realms" is replaced by "Land of Dragons" SetTlkOverride(199, "Males of the Land of Dragons can aspire to any field of activity, from scholarly pursuits to the arts of war."); SetTlkOverride(200, "Females of the Land of Dragons can aspire to any field of activity, from scholarly pursuits to the arts of war.");}
// Example of overriding the "<CUSTOM0> Divine Damage" string with a new damage type and colour// You must encapsulate the colour tokens in custom tokens first.void main(){ SetCustomToken(100, "</c>"); SetCustomToken(101, "<cÿ´ô>"); SetTlkOverride(5593, "<CUSTOM100><CUSTOM101><CUSTOM0> Something Painful");}
// Example of a using << technique insteadvoid main(){ SetTlkOverride(5593, "<</c><<cÿ´ô><CUSTOM0> Something Painful");}
### See Also
functions:  |  GetStringByStrRef, SetCustomToken
