<!-- Source: https://nwnlexicon.com/index.php/ActionUseTalentOnObject -->

# ActionUseTalentOnObject(talent, object)
Use tChosenTalent on oTarget. 
void ActionUseTalentOnObject( talent tChosenTalent, object oTarget);
### Parameters 

tChosenTalent
    Talent to use. 

oTarget
    The object one which to use the talent
### Description
Use tChosenTalent on oTarget. 
### Known Bugs
This function doesn't work on placeables. 
Also this function doesn't work reliably with talents created directly using TalentSpell function. Bioware never uses TalentSpell so good luck if you try to. 
### Version
1.61 
### Example
// Have the caller taunt the nearest non-PCvoid main(){ // Determine skill to use talent tTaunt = TalentSkill(SKILL_TAUNT); object oCreature = GetNearestCreature(CREATURE_TYPE_PLAYER_CHAR, PLAYER_CHAR_NOT_PC); ActionUseTalentOnObject(tTaunt, oCreature);}
### See Also
functions:  | ActionUseTalentAtLocation
