<!-- Source: https://nwnlexicon.com/index.php?title=ReplaceObjectAnimation&amp;action=history -->

# ReplaceObjectAnimation(object, string, string)

Replaces oObject's animation sOld with sNew. 
void ReplaceObjectAnimation( object oObject, string sOld, string sNew = "");
#### Parameters 

oObject
    The object to replace an animation for. 

sOld
    The name of the animation to replace. 

sNew
    The replacement animation name (maximum 16 characters long).
#### Description
Replaces oObject's animation sOld with sNew. 
Specifying sNew = "" will restore the original animation. 
This is not saved to the PC BIC but is tied to their object ID, so should work if logging out and back in, and is also saved to save game files. 
#### Remarks
This can be used in many ways, in particular: 
  * Replacing a whole host of combat animations on a given object - no need for swapping phenotypes around anymore
  * Using with the custom animation slots otherwise unavailable animations, such as various attack animations, for cutscenes or emotes
  * Special walks and the like are a lot easier with this

You can find a list of default animations names on the modding wiki. 
Note that sNew is limited to 16 characters; the name gets truncated when over 16 characters long. This is similar to ReplaceObjectTexture and its limit of 16 characters. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
Example of how to replace animations of the EffectKnockdown
// Knocks down a player onto their back for fDuration.void KnockDownBack(object oPlayer, float fDuration) { ReplaceObjectAnimation(oPlayer, "kdfnt", "kdbck"); ReplaceObjectAnimation(oPlayer, "kdfntps", "kdbckps"); ReplaceObjectAnimation(oPlayer, "kdfntdmg", "kdbckdmg"); AssignCommand(oPlayer, ApplyEffectToObject(DURATION_TYPE_TEMPORARY, EffectKnockdown(), oPlayer, fDuration)); DelayCommand(fDuration, ReplaceObjectAnimation(oPlayer, "kdfnt", "")); DelayCommand(fDuration,ReplaceObjectAnimation(oPlayer, "kdfntps", "")); DelayCommand(fDuration,ReplaceObjectAnimation(oPlayer, "kdfntdmg", ""));}
Example of how to redefine a custom animation 
EE now allows 70 custom animations per phenotype. Note that, as explained in the wiki, animations can have three parts, but often new custom animations only define the middle part. In that case, to override an existing custom animation successfully, it may be necessary to redefine the beginning and end as "idle". In this example, animation CUSTOM1 is replaced with one called "climb": 
ReplaceObjectAnimation(oPC, "custom1start", "idle"); ReplaceObjectAnimation(oPC, "custom1lp", "climb"); ReplaceObjectAnimation(oPC, "custom1end", "idle"); AssignCommand(oPC, ActionPlayAnimation(ANIMATION_LOOPING_CUSTOM1));
#### See Also
constants:  |  ANIMATION
