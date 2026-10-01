<!-- Source: https://nwnlexicon.com/index.php/ActionUseSkill -->

# ActionUseSkill(int, object, int, object)

Causes a creature to attempt to use a skill on another object. 
void ActionUseSkill( int nSkill, object oTarget, int nSubSkill = 0, object oItemUsed = OBJECT_INVALID);

### Parameters 

nSkill
    The SKILL_* constant representing the skill to use 

oTarget
    Target to use the skill on 

nSubSkill
    The SUBSKILL_* constant identifying the subskill to use. (Default: 0) 

oItemUsed
    Item to use in conjunction with the skill (Default: OBJECT_INVALID)
### Description
Adding this action to the queue of a creature will make it attempt to use the specified skill. It will have no effect on the wrong sort of object - you cannot unlock a creature, or taunt a door. 
The nSubSkill parameter is used for recovering, disarming, and flagging traps. 
oItemUsed must be a valid item appropriate to the skill. For example, a Healing Kit can be used with SKILL_HEAL. The creature must possess the item to use it. 
Use ActionUseSkill with the same parameter values on oTarget again to cause it to stop using a skill which it is currently using. 
### Remarks
Some skills can be hostile acts, and invite attacks of opportunity (e.g., SKILL_TAUNT). 
Also note that most skills are not selectable, so really only SKILL_ANIMAL_EMPATHY, SKILL_DISABLE_TRAP, SKILL_HEAL, SKILL_OPEN_LOCK, SKILL_PICK_POCKET and SKILL_TAUNT can be used. 
The skills SKILL_PARRY, SKILL_HIDE, and SKILL_SEARCH can be toggled with SetActionMode(). 
SKILL_OPEN_LOCK can be used with ActionUnlockObject(). 
### Known Bugs
SKILL_SET_TRAP does not work at all with this function, and therefore NPC's can never ever set traps. (Note that you can simulate the NPC setting the trap with CreateTrapAtLocation() or CreateTrapOnObject().) 
### Version
1.61 
### Example
// The NPC in conversation with a PC Attempts to heal a PC with a healing kitvoid main(){ // Quick loop of inventory - get first BASE_ITEM_HEALERSKIT object oInventory = GetFirstItemInInventory(); object oKit; while(GetIsObjectValid(oInventory)) { // Get if healers kit if(GetBaseItemType(oInventory) == BASE_ITEM_HEALERSKIT) { oKit = oInventory; break; } oInventory = GetNextItemInInventory(); } // Check oKit if(GetIsObjectValid(oKit)) { // Use our heal skill. ActionUseSkill(SKILL_HEAL, GetPCSpeaker(), 0, oKit); }}
### See Also
functions:  | GetSkillRank  

constants:  | SUBSKILL_* Constants
