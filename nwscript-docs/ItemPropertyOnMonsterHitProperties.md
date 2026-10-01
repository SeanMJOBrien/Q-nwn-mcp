<!-- Source: https://nwnlexicon.com/index.php/ItemPropertyOnMonsterHitProperties -->

# ItemPropertyOnMonsterHitProperties(int, int)

Returns an OnMonsterHit itemproperty that can be applied to a monster's creature weapons. 
itemproperty ItemPropertyOnMonsterHitProperties( int nProperty, int nSpecial = 0);
### Parameters 

nProperty
    The IP_CONST_ONMONSTERHIT_* constant representing the property to apply OnHit. 

nSpecial
    A 2da reference row pertaining to the OnHit property. Due to a bug, however, nProperty is used as the 2da reference instead.
### Description
This is a constructor function that creates an OnHit itemproperty which can be applied to a monster's creature weapons using AddItemProperty() or a similar function. Itemproperties created by this function can only be applied to monster _natural_ weapons (i.e., bite, claw, gore, and slam). _They will not work with normal weapons._
 | Note: the following describes how the function is _supposed_ to work. See Known Bugs for how it _actually_ works.   

You must specify the IP_CONST_ONMONSTERHIT_* constant representing the OnHit property that you want applied. Some of the itemproperties require setting the second parameter, nSpecial, as well: 
nProperty  | nSpecial Description   

IP_CONST_ONMONSTERHIT_ABILITYDRAIN  | IP_CONST_ABILITY_* constant representing the ability to drain.   
IP_CONST_ONMONSTERHIT_DISEASE  | DISEASE_* constant representing the disease to apply.   
IP_CONST_ONMONSTERHIT_LEVELDRAIN  | The number (between 1 and 5) of levels to drain.   
IP_CONST_ONMONSTERHIT_POISON  | IP_CONST_POISON_* constant representing the type of poison that will effect the victim.   
IP_CONST_ONMONSTERHIT_WOUNDING  | The amount (between 1 and 5) of wounding to apply.   
Note: Any properties that do not appear in the above list do not require the second parameter. 
### Remarks
The itemproperty commands are special constructors: they construct an itemproperty "object" which can then be applied to an item using AddItemProperty(), much like how effects are first constructed and then applied with ApplyEffectToObject(). 
Only the properties defined by IP_CONST_ONMONSTERHIT_* constants can be added to monster weapons with this function. These are as follows: 
  * Ability drain
  * Confusion
  * Disease
  * Doom
  * Fear
  * Level drain (see below)
  * Poison
  * Slow
  * Stun
  * Wounding (see below)

Other on-hit properties can be added to monster weapons with the ItemPropertyOnHitProps() constructor. 
It will often be a good idea to remove similar itemproperties from the item first. There's a command in the x2_inc_itemprop include file called IPSafeAddItemProperty() which will do that for you. Check IPSafeAddItemProperty() for the current bug report. 
The IP_CONST_ONMONSTERHIT_* value can be retrieved off this type of itemproperty using GetItemPropertySubType(), while the corresponding 2da row can be retrieved by GetItemPropertyParam1Value(). 
### Known Bugs
The second parameter, nSpecial, is supposed to be a 2da reference row. For example, if you wanted to drain charisma OnHit, nSpecial would be IP_CONST_ABILITY_CHA. IP_CONST_ABILITY_CHA's value, 5, corresponds to the line in iprp_abilities.2da defining charisma as the ability to drain. **However, the second parameter is ignored in all cases, and nProperty is used instead.** This means, no matter what value nSpecial has, the properties that require the special parameter always act the same: 
nProperty  | Value  | Description of effect   
---|---|---  
IP_CONST_ONMONSTERHIT_ABILITYDRAIN  | 0  | Always drains strength (0 matches the row IP_CONST_ABILITY_STR in iprp_abilities.2da).   
IP_CONST_ONMONSTERHIT_DISEASE  | 2  | Always applies Demon Fever (2 matches the row DISEASE_DEVIL_CHILLS (erroneously named) in disease.2da).   
IP_CONST_ONMONSTERHIT_LEVELDRAIN  | 5  | Not a valid itemproperty (5 is an undefined row in iprp_amount.2da).   
IP_CONST_ONMONSTERHIT_POISON  | 6  | Always applies Large Scorpion Venom (6 matches POISON_LARGE_SCORPION_VENOM in poison.2da).   
IP_CONST_ONMONSTERHIT_WOUNDING  | 9  | Not a valid itemproperty (9 is an undefined row in iprp_amount.2da).   
You can add the coresponding rows to iprp_amount.2da to make IP_CONST_ONMONSTERHIT_LEVELDRAIN and IP_CONST_ONMONSTERHIT_WOUNDING valid properties, but they'll always use the amount you enter on that row. 
Note that this bug affects only itemproperties created by this function. When creating creature items in the Toolset, you have full access to all the 2da rows and can implement the OnMonsterHit properties that cannot be created with this function. 

You can work around this now with ItemPropertyCustom. 
### Version
1.61 
### Example
//The include is for the IPSafeAddItemProperty function#include "x2_inc_itemprop"//Makes the PC speaker's specially equipped bite weapon cause ability drain of strengthvoid main(){ object oPC = GetPCSpeaker(); object oItem = GetItemInSlot(INVENTORY_SLOT_CWEAPON_B, oPC); int nProperty = IP_CONST_ONMONSTERHIT_ABILITYDRAIN; int nSpecial = IP_CONST_ABILITY_STR; // Distinction not needed because of the bug. // Strength will be automatically selected regardless of the value of nSpecial. if ((oItem)) return; itemproperty ipAdd = ItemPropertyOnMonsterHitProperties(nProperty, nSpecial); IPSafeAddItemProperty(oItem, ipAdd);}
### See Also
functions:  | ItemPropertyOnHitProps, ItemPropertyCustom  

constants:  | IP_CONST_ONMONSTERHIT_* Constants
