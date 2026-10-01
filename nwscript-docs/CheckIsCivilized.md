<!-- Source: https://nwnlexicon.com/index.php/CheckIsCivilized -->

# CheckIsCivilized()
Marks the caller as civilized based on its racial type. 
void CheckIsCivilized();

### Description
Marks the caller as civilized based on its racial type. 
### Remarks
Sets the animation condition flag NW_ANIM_FLAG_IS_CIVILIZED on all player racial types (elf, gnome, half-elf, halfling, half-orc, and human) except for dwarves. 
It also sets the NW_ANIM_FLAG_IS_CIVILIZED flag for the humanoid monster races (goblinoid, reptilian, and orc). 
The name of this function is misleading. You can not use it to see if the calling object is civilized or not. No value is returned. The function's purpose is to set the caller's NW_ANIM_FLAG_IS_CIVILIZED flag. If you want to know if the caller is civilized or not you need to use GetAnimationCondition(). 
### Requirements
#include "x0_i0_anims" 
### Version
??? 
### See Also
functions:  | GetAnimationCondition, SetAnimationCondition  

constants:  | RACIAL_TYPE_* Constant Group
