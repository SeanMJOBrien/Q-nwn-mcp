<!-- Source: https://nwnlexicon.com/index.php/SetDescription -->

# SetDescription(object, string, int)
Sets the description of an object. 
void SetDescription( object oObject, string sNewDescription = "", int bIdentified = TRUE);
#### Parameters 

oObject
    The object for which you are changing the description. 

sNewDescription
    The new description that oObject will use. (Default: "") 

bIdentified
    For items, use the specified string as the description when the item is identified. (Default: TRUE)
#### Description
Sets the description of an object. This function works on player characters, creatures, placeables, items, doors, and triggers. 
#### Remarks
If sNewDescription is not provided (or explicitly specified as an empty string ("")), the description will revert to the object's original description. If you want to "blank" a description the best option is a single space - " " 
bIdentified is only used if oObject is an item. Setting bIdentified to TRUE will set the identified description, setting this to FALSE will set the unidentified description. 
You can change the color of the text shown using StringToRGBString and other special strings. 

This function was updated in 1.74.8154 of NWN:EE. 
In 1.69 the limit of this function was 8KB of text. This has now been increased in 1.74.8154 to 128KB of text. However please be wary of setting a large amount since the player loads it from the server every time it is viewed. 
#### Version
1.69 
#### Example
// Part of the code for the OnClientEnter event used on Realms of Mythology PW. // Checks to see if the incoming new character has kept the default racial description. // Not a good idea to do on a RP PW with a sassy scripting geek! If their description is the default// one it is time to sass them main(){ // The object that just entered object oPlayer = GetEnteringObject();<br /> // Check to see if this is a new or returning character. We only need to check the character  // description the very first time they enter. if(FALSE == GetCampaignInt("YOUR_DATABASE_NAME_HERE", "MYTHOS_RETURNING_CHARACTER", oPlayer)) { // Keep track of if they took the default description int bTookDefaultDesc = FALSE; // What is their description string sCharDesc = GetDescription(oPlayer); // What race are they? switch(GetRacialType(oPlayer)) { // dwarf case 0: { // Compare the tlk file description (defined in racialtypes.2da) against the character's // description. If they are a perfect match, it is time to sass them! if(sCharDesc == GetStringByStrRef(8157)) { bTookDefaultDesc = TRUE; } break; } // elf case 1: { if(sCharDesc == GetStringByStrRef(8158)) { bTookDefaultDesc = TRUE; } break; } // gnome case 2: { if(sCharDesc == GetStringByStrRef(8159)) { bTookDefaultDesc = TRUE; } break; } // halfling case 3: { if(sCharDesc == GetStringByStrRef(8160)) { bTookDefaultDesc = TRUE; } break; } // half elf case 4: { if(sCharDesc == GetStringByStrRef(8161)) { bTookDefaultDesc = TRUE; } break; } // half orc case 5: { if(sCharDesc == GetStringByStrRef(8162)) { bTookDefaultDesc = TRUE; } break; } // human case 6: { if(sCharDesc == GetStringByStrRef(8163)) { bTookDefaultDesc = TRUE; } break; } } // switch(GetRacialType(oPlayer))) // Deal with them if they were stupid if(TRUE == bTookDefaultDesc) { // Scold the player SendMessageToPC(oPlayer, "(( Shame on you! Logging into a RP server and using the default racial description. ))"); // Set the character's description SetDescription(oPlayer, "(( I am a lazy bum who has no interest in taking a few minutes to bring a bit of life to my character. ))"); } // if(TRUE == bTookDefaultDesc) // Set the test flag so this check is only done once. SetCampaignInt("YOUR_DATABASE_NAME_HERE", "MYTHOS_RETURNING_CHARACTER", TRUE, oPlayer); } // if(FALSE == GetCampaignInt... } // END of void main()
#### See Also
functions:  |   GetDescription  StringToRGBString
