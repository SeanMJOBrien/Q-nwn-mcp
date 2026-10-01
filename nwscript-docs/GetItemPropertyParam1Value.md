<!-- Source: https://nwnlexicon.com/index.php/GetItemPropertyParam1Value -->

# GetItemPropertyParam1Value

# GetItemPropertyParam1Value(itemproperty)
Returns the Param1 value of the item property. 
int GetItemPropertyParam1Value( itemproperty ipProp);
#### Parameters
_ipProp_
Itemproperty to get the parameter value from. 
#### Description
Returns the Param1 value of the item property. See the 2DA files for value definitions. 
#### Remarks
The 2da file you find info for the return values of this function depends on the output of the GetItemPropertyParam1 function. Look at the individual ItemProperty functions to see what (if anything) this function will return for that particular itemproperty. A return value of -1 occurs if the itemproperty has no param1 value, or if ipProp isn't a valid itemproperty. For instance, you may have a call to GetItemPropertyParam1, which returns 1. Looking in iprp_paramtable.2da, you'll see that this is the iprp_onhitdur.2da file. Then, the call to GetItemPropertyParam1Value might return 0. Looking in your iprp_onhitdur.2da file, you'll see that this means 5 effect change, 5 rounds duration. I recommend using this program to view your .2da files, the NWN Explorer, which can be downloaded here: <http://nwvault.ign.com/Files/other/data/1055545441750.shtml> If you have HotU installed, you should always open the HotU data. If you don't have HotU, but you do have SoU, you should always open the SoU data. Otherwise, you must use the NWN data. First, check if the patch has the iprp_onhitdur.2da (or whichever) file in it (open your data's patch section, open the file called patch.bif or something similar (e.g. xp2patch.bif), game data, and that is where you should find it. If it isn't there, it means it hasn't been updated in a patch, and you should look in the data section mentioned before. Following the above procedure will ensure that you ALWAYS view the more recent version of the .2da file, provided that your patch of NWN is up-to-date. Please note that older versions of the NWN Explorer might not look in the patch files, so it is recommended that you download the latest version. 
#### Version
1.62 
#### See Also
functions:  |   GetItemPropertyParam1
