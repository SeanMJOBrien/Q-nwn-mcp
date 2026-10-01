<!-- Source: https://nwnlexicon.com/index.php/GetItemPropertySubType -->

# GetItemPropertySubType(itemproperty)
Gets the subtype of an itemproperty. 
int GetItemPropertySubType( itemproperty ipProperty);
#### Parameters 

ipProperty
    The itemproperty to get the subtype of
#### Description
Returns the SubType number of the item property or -1 when no subtype exists (although it might be 0, see the Known Bugs section). See the 2DA files for value definitions. 
#### Remarks
The 2da file you find info for the return values of this function is the itempropdef.2da file. 
Look at the individual ItemProperty functions to see what (if anything) this function will return for that particular itemproperty. 
A return value of -1 means that the itemproperty has no subtype, or that the itemproperty isn't valid. 
You can extract the games .2da files with a tool such as NWN Explorer
If you have HotU installed, you should always open the HotU data. If you don't have HotU, but you do have SoU, you should always open the SoU data. Otherwise, you must use the NWN data. First, check if the patch has the itempropdef.2da file in it (open your data's patch section, open the file called patch.bif or something similar (e.g. xp2patch.bif), game data, and that is where you should find it. If it isn't there, it means it hasn't been updated in a patch, and you should look in the data section mentioned before. 
Following the above procedure will ensure that you ALWAYS view the more recent version of the .2da file, provided that your patch of NWN is up-to-date. 
Please note that older versions of the NWN Explorer might not look in the patch files or work with NWN:EE, so it is recommended that you download the latest version. 
#### Known Bugs
When an item is created dynamically with no subtype the value -1 is returned by this function as expected. However, when an item is created during design time by using the toolset, this function returns 0 if no subtype is placed on the item. 
#### Version
1.62 
#### See Also  
---
