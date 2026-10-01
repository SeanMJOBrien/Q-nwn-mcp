<!-- Source: https://nwnlexicon.com/index.php/StringToRGBString -->

# StringToRGBString(string, string)
Given a string and an RGB color encoded string, this function returns an equivalent string that will display in the specified color. 
string StringToRGBString( string sString, string sRGB);

### Parameters 

sString
    The source string to be color enhanced. 

sRGB
    The RGB encoded string that specifies the color.
### Description
Given a string and an RGB color encoded string, this function returns an equivalent string that will display in the specified color. 
This specifically works with all of the string-displaying and setting functions: SpeakString, ActionSpeakString, SendMessageToPC, SendMessageToAllDMs, SetName, SetDescription and potentially others. 
### Remarks
The RGB encoded string value specified in the **sRGB** parameter is used to specify the color used to tint the source string. The string consists of three characters representing, from left to right, the red component, green component, and blue component of the color. Each of these three characters must be a numeral from 0-7 that specifies the intensity of the associated color channel. Zero means no intensity from the associated color channel, 7 means maximum intensity of that color. Thus, "777" means maximum intensity for all three color channels red, green, and blue which will result in a white text color. "070" would be maximum green with no red or blue resulting in a bright pure green color. "004" would make the text be a mid intensity blue color. 
There are seven commonly used RGB color encoded string constants predefined by default that can be used with the function in the **sRGB** parameter. They are outlined at the top of the x3_inc_string topic. 
The entire string specified by the **sString** parameter will be color encoded to display in the specified color. This does not mean that strings must be all one color, just that this function colorizes the entire string passed to it. To make a string composed of several different colors, each separate piece of the string will need to be colorized by this function separately and then pieced together to create the final multi-colored result. 
It is important to understand how colorization works in the game interface. The color coding is specified to the game engine using special codes embedded in the text that delineate the start and end of the colorized sections of text within the entire string. This function adds those codes to the source string by inserting the start-color-block code at the beginning and the end-color-block code at the end, and then returns the resulting string. Thus a colorized string will have the following format: 
<**start-color-block code** >**the colored text** <**end-color-block code** >
What this means is that an already colorized string cannot be re-colorized again because the second application of the color codes will wrap the previous color codes and therefore have no effect on the text itself. For example, a string colorized to be green: 
<**start-green code** >**green text** <**end-green code** >
cannot be changed to blue: 
<**start-blue code** ><**start-green code** >**still green text** <**end-green code** ><**end-blue code** >
because as you can see the codes are telling the game engine to start making it blue, then start making it green, then the string itself, then the end green, and finally the end blue. Because the green codes are embedded inside the blue ones, they have the priority and so the resulting string will still show up as green, not blue. In order to change a colorized string to another color, the existing special color codes must be stripped off first before recolorizing it to the new color. 
This is particularly critical when using functions such as GetName, SetName, GetDescription, and SetDescription. If an object's name or description has been colorized, then the GetName or GetDescription function will return not only the text, but the embedded color codes as well. And because the color codes are returned as part of the text, you cannot compare the text returned by those functions to an uncolorized string to see if they are equivalent. For instance, in the script snippet below the first if statement's conditions will never evaluate to TRUE: 
... string sNewItemName = "Sir Elric's Bulletproof Plate Mail"; SetName(oItem, StringToRGBString(sNewItemName, STRING_COLOR_RED)); if(GetName(oItem) == "Sir Elric's Bulletproof Plate Mail") { // this will never happen } else if(GetName(oItem) == sNewItemName) { // this will never happen either } else { // this will always happen } if(GetName(oItem) == StringToRGBString(sNewItemName, STRING_COLOR_RED)) { // this will always happen } ...
### Known Bugs
The RGB string's format must be three characters in length and each character must be a digit from 0-7. The function performs no validation checking at all to determine if the RGB string passed in matches the expected format or not. If the RGB string specified is not of the proper format, the resulting string will have invalid color coding added to it anyway. Only the first three characters of the RGB string are considered, any superfluous characters beyond that are ignored. Each invalid or missing character in the RGB string will be treated as a zero. So a completely invalid RGB string will produce black colorized text. 
### Requirements
#include "x3_inc_string" 
### Version
1.69 
### Example
// In this example an NPC awards players a special combat item based on their// class during a conversation. The item's name is changed to include the player's// name and is colorized so that it will display in green. The item's description// is also customized and the first line of it is colorized to appear in yellow.// ActionTaken script to award a special combat item to the player. Its name// and description is customized and colorized to indicate it's owner.#include "x3_inc_string"void main(){ // Find the player who is speaking to the NPC. object oPC = GetPCSpeaker(); // Determine the resref of the combat item to award based on the player's // first class. string sCombatItemResref = ""; switch(GetClassByPosition(1, oPC)) { case CLASS_TYPE_BARBARIAN: sCombatItemResref = "barb_combat_item"; break; case CLASS_TYPE_BARD: sCombatItemResref = "bard_combat_item"; break; case CLASS_TYPE_CLERIC: sCombatItemResref = "clrc_combat_item"; break; case CLASS_TYPE_DRUID: sCombatItemResref = "drud_combat_item"; break; case CLASS_TYPE_FIGHTER: sCombatItemResref = "fgtr_combat_item"; break; case CLASS_TYPE_MONK: sCombatItemResref = "monk_combat_item"; break; case CLASS_TYPE_PALADIN: sCombatItemResref = "paly_combat_item"; break; case CLASS_TYPE_RANGER: sCombatItemResref = "rngr_combat_item"; break; case CLASS_TYPE_ROGUE: sCombatItemResref = "rogu_combat_item"; break; case CLASS_TYPE_SORCERER: sCombatItemResref = "sorc_combat_item"; break; case CLASS_TYPE_WIZARD: sCombatItemResref = "wzrd_combat_item"; break; } // Next the item is created and given to the player. object oSpecialCombatItem = CreateItemOnObject(sCombatItemResref, oPC); // If the item was not created for some reason, do nothing further. if((oSpecialCombatItem)) { return; } // Get the item's name, prepend the player's name to the front of it, then // colorize the entire name in green text and change the item to use the // new green name. string sItemName = GetName(oSpecialCombatItem); string sPlayerName = GetName(oPC); string sNewItemName = sPlayerName + "'s " + sItemName; string sGreenItemName = StringToRGBString(sNewItemName, STRING_COLOR_GREEN); SetName(oSpecialCombatItem, sGreenItemName); // Get the item's original description. Make a yellow version of the new item // name just computed, and prepend it to the description followed by a blank // line ("\n\n"). Then change the item's description to use the new // description. Yellow is produced by encoding equal intensities of red and // green with no blue (i.e. RGB string "770"). string sItemDescription = GetDescription(oSpecialCombatItem, TRUE); string sYellowItemName = StringToRGBString(sNewItemName, "770"); string sNewDescription = sYellowItemName + "\n\n" + sItemDescription; SetDescription(oSpecialCombatItem, sNewDescription);}

### See Also
constants:  | STRING_COLOR_*  

functions:  | SendMessageToAllDMs | SendMessageToPC | FloatingTextStringOnCreature | SetName | SetDescription
