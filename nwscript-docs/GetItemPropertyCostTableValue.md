<!-- Source: https://nwnlexicon.com/index.php/GetItemPropertyCostTableValue -->

# GetItemPropertyCostTableValue

# GetItemPropertyCostTableValue(itemproperty)
Returns the cost table value of an itemproperty. 
int GetItemPropertyCostTableValue( itemproperty ipProp);
#### Parameters
_ipProp_
itemproperty to get the cost table value from. 
#### Description
Returns the Cost Table value (index of the cost table) of the item property. See the 2DA files for value definitions. 
#### Remarks
The 2da file you find info for the return values of this function depends on the output of the GetItemPropertyCostTable function. Look at the individual ItemProperty functions to see what (if anything) this function will return for that particular itemproperty. A return value of -1 means that the itemproperty has no cost table value, or that the itemproperty isn't valid. For instance, you may have a call to GetItemPropertyCostTable, which returns 1. Looking in iprp_costtable.2da, you'll see that this is the iprp_bonuscost.2da file. Then, the call to GetItemPropertyCostTableValue might return 5. Looking in your iprp_bonuscost.2da file, you'll see that this means a bonus of 5. A call to GetItemPropertySubType returns 1, which is an ability. You thus know, from the above, that you're dealing with an ability bonus of 5. I recommend using this program to view your .2da files, the NWN Explorer, which can be downloaded here: <https://github.com/virusman/nwnexplorer/releases> If you have HotU installed, you should always open the HotU data. If you don't have HotU, but you do have SoU, you should always open the SoU data. Otherwise, you must use the NWN data. First, check if the patch has the iprp_bonuscost.2da (or whichever) file in it (open your data's patch section, open the file called patch.bif or something similar (e.g. xp2patch.bif), game data, and that is where you should find it. If it isn't there, it means it hasn't been updated in a patch, and you should look in the data section mentioned before. Following the above procedure will ensure that you ALWAYS view the more recent version of the .2da file, provided that your patch of NWN is up-to-date. Please note that older versions of the NWN Explorer might not look in the patch files, so it is recommended that you download the latest version. 
#### Version
1.62 
#### See Also
functions:  |   GetItemPropertyCostTable
