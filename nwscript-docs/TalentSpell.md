<!-- Source: https://nwnlexicon.com/index.php/TalentSpell -->

# TalentSpell(int)

Creates a spell talent 
talent TalentSpell( int nSpell);
#### Parameters 

nSpell
    SPELL_*
#### Description
Create a Spell Talent. 
#### Remarks
The talent created by this function is always valid. No matter what spell id you put there, -2 or 20000, GetIsTalentValid always returns TRUE regardless whether spell exists or not. 
#### Known Bugs
Talent defined via this function do not work with ActionUseTalentOnObject function, it might result in the NPC not doing anything and standing there. In other cases it will even show the spell animations but then just stops without firing the effect. The spell isn't used up either. 
So far it is unknown which spells works, which doesn't and why is that, so it is better to avoid ActionUseTalent entirely and replace it with ActionCastSpellAtObject (although that does have it's own bugs). This means that this function is basically useless as you can do anything you would want to do with talent manually with spell functions. _Note: probably the only time this worked for me was npc polymorphed into harpy shape with spell ability 686 and rakshasa shape with ice storm and mestil's breath. Shadooow_
#### Version
1.30 
#### Example
// Code sample invalid as TalentSpell/Feat/Skill do not work.
#### See Also
functions:  | TalentSkill TalentFeat ActionUseTalent") GetIsTalentValid  

constants:  | SPELL_* Constants
