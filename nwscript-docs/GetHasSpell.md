<!-- Source: https://nwnlexicon.com/index.php/GetHasSpell -->

# GetHasSpell

# GetHasSpell(int, object)
Determines whether a creature has a spell available. 
int GetHasSpell( int nSpell, object oCreature = OBJECT_SELF);
#### Parameters
_nSpell_
 SPELL_* 
_oCreature_
The creature to test for a spell. (Default: OBJECT_SELF) 
#### Description
Returns an integer indicating how many instances of a particular nSpell are left on oCreature, or FALSE (0) if no more instances of that spell remain. 
#### Remarks
This should usually only be used as a binary yes/no in most the case of "can this create in some capacity cast nSpell". This is due to the weird return values due to spontaneous castings and involving metamagic. You cannot specify a specific spellbook to check nor if the spell you want to find has a particular metamagic available. 
Due to bugs with ActionCastSpellAtObject this function may return a creature having a spell, but unable to use it properly in that action, generally in regards to spontaneous casting cleric healing/inflict spells. 
Prior to patch 1.25 this function would not work properly for sorcerers or bards. 
With patch 1.61, metamagic feats applied to spells and domain feats are now considered for this function (previously this was not the case). The return values for these spells are very odd. 
The following factors determine the multiplier value of the return of GetHasSpell: 
  * No metamagic feat applied: 1
  * Cleric domain spell, no metamagic feat applied: 2
  * Silent metamagic feat applied: 3
  * Still metamagic feat applied: 3
  * Extended metamagic feat applied: 3
  * Quickened metamagic feat applied: 1
  * Maximized metamagic feat applied: 1
  * Empowered metamagic feat applied: 1

Who knows why this is the case since this means GetHasSpell does not return the amount of castings you can do all the time. If you had 2 Shield spells prepared on an NPC, and a further 1 Shield with Still metamagic, gives a result of 5. 
When multiclassed it will compute the total, so Light prepared by a Cleric and Wizard multiclass will return the total. 
Returns 1 for each spontaneous use when looking for cure/inflict spells cast by clerics. EG: If you have 3 Light slots, and 1 slot of Cure Minor Wounds, it will return 4, the total number of slots. 
When a Bard or Sorcerer copy of the spell is found it returns all available castings of spells at that level (eg; all available castings of level 1 spells will be shown if Mage Armour is specified for a sorcerer who knows it). This is added onto any other class totals (A Wizard/Sorcerer with 1 prepared Shield in the Wizard book, and 4 Sorcerer slots available, has this function return 5). 
Always adds only 1 if the spell is in the monster abilities list, in spite of how many uses may be left. A Wizard with 1 Shield spell slot prepared, and 10 monster ability castings of Shield available, will return 2. 
#### Known Bugs
As noted above the insanity of what is returned makes this little more useful than a "we have at least one casting of this available, somehow". 
#### Version
1.61 
#### See Also
functions:  |   HasSpell   

constants:  |   SPELL_* Constants
