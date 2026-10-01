<!-- Source: https://nwnlexicon.com/index.php/LevelUpHenchman -->

# LevelUpHenchman(object, int, int, int)
Levels up a creature using the default settings. 
int LevelUpHenchman( object oCreature, int nClass = CLASS_TYPE_INVALID, int bReadyAllSpells = FALSE, int nPackage = PACKAGE_INVALID);
#### Parameters 

oCreature
    Creature to level up. 

nClass
    A CLASS_TYPE_* constant matching the class to level the creature in. (Default: CLASS_TYPE_INVALID) 

bReadyAllSpells
    Determines if all memorizable spell slots will be filled without requiring rest. (Default: FALSE) 

nPackage
    A PACKAGE_* constant (or packages.2da line) matching the package used to select skills and feats for the henchman. (Default: PACKAGE_INVALID)
#### Description
Levels up a creature using the default settings. Returns the new level if successful, or 0 if the function fails. In addition if successfully used on an NPC its Challenge Rating is raised by 1. 
You can assign a new class to level up in by specifying anything CLASS_TYPE_* constant other than CLASS_TYPE_INVALID (when CLASS_TYPE_INVALID is specified, the creature advances with the class in their first slot). If an invalid class combination is chosen, like Barbarian and Paladin, the default class (the first slot) is levelled up. 
The nPackage determines which package to level up with. If PACKAGE_INVALID is used, it will use the starting package picked at character creation. If the given package or starting package is matched to a different class than nClass (via packages.2da ClassID column) then it finds the first packages.2da entry with a matching ClassID (it doesn't use the classes.2da DefaultPackage entry but searchings from line 0 and up). Failing that the function fails. 
In comparison the NWN Toolset Level Up Wizard and Creature Wizard use the default package (DefaultPackage in clsses.2da) for each class to do level ups. You could make these match the lowest line in packages.2da to make it similar to the LevelUpHenchmen way of finding a valid package. 
#### Remarks
In order to level up a henchman (or any NPC, it isn't restricted to henchmen), that NPC must have followed its packages stringently. When you create a creature in the toolset, giving it, say, 5 levels of wizard, it automatically follows its packages. If you then start adding feats manually to it, for instance, you'll no longer be able to use the LevelUpHenchman() command successfully on that NPC. 
There a level up wizard available in the Toolset however you cannot choose a package; this along with the Creature Wizard always applies the default package. For custom NPCs and henchmen leave them at level 1 and level them when they are spawned. 
The one big thing to note is that the packages.2da lines you refer to must be valid for the given class. You cannot reuse a package line for a different class even if it would otherwise work. Bioware wants unique lines even for prestige classes. 
They themselves created for dual-class characters the same package lines but the only difference being the ClassID set. For instance in HotU Deekin has packages.2da line 72 - NPC_Bard (or "Healer, Bard" in the toolset) set as his starting class package, and is used for Bard levelups. The same package line is duplicated to line 117 with the only change to it being the class ID assigned - this time Dragon Disciple - meaning only one set of package files are really used at once. 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. packages.2da now allows values over 255. 
#### Example
//Level up henchman to level 13int nLevel = 1;for (nLevel = 1; nLevel < 14; nLevel++){ LevelUpHenchman(OBJECT_SELF);}
### See Also
constants:  |  PACKAGE_* Constants
