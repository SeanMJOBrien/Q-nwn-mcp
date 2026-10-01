<!-- Source: https://nwnlexicon.com/index.php/PostString -->

# PostString(object, string, int, int, int, float, int, int, int)

Displays sMsg on oPC's screen. 
void PostString( object oPC, string sMsg, int nX = 0, int nY = 0, int nAnchor = SCREEN_ANCHOR_TOP_LEFT, float fLife = 10.0f, int nRGBA = 2147418367, int nRGBA2 = 2147418367, int nID = 0, string sFont="");
### Parameters 

oPC
    The player to send the string message. 

sMsg
    The message string to post. 

nX
    coordinates of the first character to be displayed. The value is in terms of character 'slot' relative to the nAnchor anchor point. If the number is negative, it is applied from the right. (Default: 0) 

nY
    coordinates of the first character to be displayed. The value is in terms of character 'slot' relative to the nAnchor anchor point. If the number is negative, it is applied from the bottom. (Default: 0) 

nAnchor
    SCREEN_ANCHOR_* constant. 

fLife
    Duration in seconds until the string disappears. 0.0 means unlimited. (Default: 10.0f) 

nRGBA
    Colors of the string in 0xRRGGBBAA format. String starts at nRGBA, but as it nears end of life, it will slowly blend into nRGBA2. (Default: 2147418367) 

nRGBA2
    Colors of the string in 0xRRGGBBAA format. String starts at nRGBA, but as it nears end of life, it will slowly blend into nRGBA2. (Default: 2147418367) 

nID
    Optional ID of a string. If not 0, subsequent calls to PostString will remove the old string with the same ID, even if it's lifetime has not elapsed. Only positive values are allowed. (Default: 0) 

sFont
    If specified, use this custom font instead of default console font. (Default: "")
### Description
Displays sMsg on oPC's screen. 
The message is displayed on top of whatever is on the screen, including UI elements. 
### Remarks
Obviously this is very useful for debugging complex code, and with careful use can provide a high amount of insight into a running script. 
"As of the 8193.8 patch that added this feature, the only fonts that will work for the sFont parameter, out of the box, are "fnt_galahad14" and "fnt_console" (default). Others might work, but there might be issues as the fonts may not be complete. You can make your own and use that." -sherincall in the Neverwinter Vault #nwnee Discord channel. 
NWN Font Maker may be useful to create new fonts. 
See below examples of all available fonts in the base game, as at 8193.9, and how they appear. Note that several fonts do not print (see photo details). The DBSC family is for alternate language characters (Korean, Japaneses, etc) Game resolution 2560x1440. 

Your font can technically contain images - this has been used by some modders to add GUI-like elements to the game. This may not work across all editions of the game (console, phone and PC) but is guaranteed to work on PC. 
### Version
This function was added in 1.74.8193.8 of NWN:EE. 
### Example
void main(){ object oPC = GetFirstPC(); // Define colours using Hex. FF is highest, 00 is lowest. See online calculators if you want specific colours. int nColourRed = 0xFF0000FF; int nColourBlue = 0x0000FFFF; int nFadeOut = 0x00000000; // Top left first message, on line 0 // Fades out over 20 seconds PostString(oPC, "Debug Message, top left 0th line, in red", 0, 0, SCREEN_ANCHOR_TOP_LEFT, 20.0, nColourRed, nFadeOut); // Top left 3rd line down // The third line is much more nicely below any buttons that may appear there on the DM screen for instance // This retains it's colour for the duration then pops out of existence PostString(oPC, "Debug Message, top left 3rd line in blue", 3, 0, SCREEN_ANCHOR_TOP_LEFT, 20.0, nColourBlue, nColourBlue);}
### See Also
constants:  |   SCREEN_ANCHOR_* Constant Group
