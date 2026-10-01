<!-- Source: https://nwnlexicon.com/index.php/Get2DAString -->

# Get2DAString(string, string, int)
Retrieves a string value from a *.2da file on a server. 
string Get2DAString( string s2DA, string sColumn, int nRow);
### Parameters 

s2DA
    Name of the *.2DA file on the server. 

sColumn
    Name of the column within the *.2DA file. 

nRow
    Row number within the *.2DA file.
### Description
Returns the value of a string in the given location of a specified *.2da file. Returns an empty string if file, column, or row is not found. Returns "" (empty string) for "****" entries in the *.2da. 
The 2DA sought by Get2DAString() is cached the first time it is called, into memory. Basically - you can now use this function in a loop with a lot less noticeable loss of speed! Some 2DA files are always fast such as spells.2da and stay permanently cached. 
This caching does mean you cannot change 2da files dynamically out of game, and see changes in-game, even when using the development folder. 
### Remarks
You can now loop using this function. It will now work (or should work) as fast as the game would itself getting information from a 2da file. Likely, there now should be no noticeable loss of speed compared to pre-1.64. If there is loss of speed - it'll be greatly improved upon pre-1.64. 
Do not prefix your own *.2da files with the prefix "des_". 
The maximum length for a *.2da file is 16 characters. If you specify a longer file name, the function will fail without warning. 
Most game 2da files are up to 65535 entries as of NWN:EE, some exceptions from clippy: 
  * classes.2da is up to 254 entries
  * skills.2da also goes up to 255 max, though there's a few quirks there
  * spells.2da goes up to 65535, but in 1.69 any spells above 4096 would not be usable from the radial menu (fixed in NWN:EE)
  * races.2da may be capped up to 255 max
  * body parts are limited to 255 for network reasons but expanded to higher numbers in patch 1.87.8193.35.

A few things go even above 65535 up to 4 billion (eg feat.2da), but 65535 is quite a high limit regardless of a custom or game used 2da file. 
If you create custom 2da files there is the settings in settings.tml that relate to this function: 
  * 2da-engine-cache-size = 11
  * 2da-user-cache-size = 10

If you use more than this amount of custom 2da files it would be recommended to up this number appropriately since it's still stuck in 2002-era values. 
### Known Bugs
The maximum length of a field within a *.2da file is 267 characters. Anything longer than that will cause NWN to crash. 
Although not a bug, the changes to this in 1.64 means you cannot change a 2da file out-of-game, and it change the results in-game. This is intended 1.64 behavior. 
### Version
1.64 
### Example
// Return TRUE if weapon does bludgeoning damage// Uses Get2DAStringint GetDoesBludgeoningDamage(object oWeapon){ int nBaseType = GetBaseItemType(oWeapon); return (StringToInt(Get2DAString("baseitems", "WeaponType", nBaseType)) == 2); // 2 = bludgeoning}
### See Also
functions:  |  Get2DARowCount Get2DAColumn
