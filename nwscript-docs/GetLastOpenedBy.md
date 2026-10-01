<!-- Source: https://nwnlexicon.com/index.php/GetLastOpenedBy -->

# GetLastOpenedBy

# GetLastOpenedBy()
Get the last creature that opened the caller. 
object GetLastOpenedBy();
#### Description
Get the last creature that opened the calling object. Returns OBJECT_INVALID if the caller is not a valid door, placeable, or store. 
#### Version
1.61 
#### Example
//Kill everyone who opens me if they don't have a certain//local variable set. Goes OnOpen.void main(){object oPC=GetLastOpenedBy();if (GetLocalInt(oPC, "may_open")) return;effect eDeath=EffectDeath();DelayCommand(0.5, ApplyEffectToObject(DURATION_TYPE_INSTANT, eDeath, oPC));}
#### See Also
functions:  |   GetLastUsedBy
