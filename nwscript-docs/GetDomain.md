<!-- Source: https://nwnlexicon.com/index.php?title=GetDomain&amp;action=history -->

# GetDomain(object, int, int)

Returns the creature's domain in nClass. 
int GetDomain( object oCreature, int nDomainIndex = 1, int nClass = CLASS_TYPE_CLERIC);
### Parameters 

oCreature
    The creature object to query. 

nDomainIndex
    Must be 1 or 2. 

nClass
    The class to query for a domain.
### Description
Returns oCreature's domain in nClass (DOMAIN_* Constants, referencing domains.2da). 
nDomainIndex - 1 or 2. 
Unless custom NWN:EE content is used, only Clerics have domains. 
Returns -1 on error. 
### Remarks
NWN:EE allows more than just Clerics to have domains (and associated extra spells/feats). Therefore you need to loop all 3 classes in NWN:EE to accurately check for domains. 
In older versions you can only check for specific domains when they have an associated feat by GetHasFeat. 
### Version
This function was added in 1.74.8193.8 of NWN:EE. 
### Example
// Checks if any of the classes the PC speaking to this person have are the Animal domain, if so reward some additional goldvoid main(){ object oPC = GetPCSpeaker(); int bAnimalDomain = FALSE; int nSlot, nClass; // Check for Animal domain for(nSlot = 1; nSlot <= 3; nSlot++) { nClass = GetClassByPosition(nSlot, oPC); if(nClass != CLASS_TYPE_INVALID) { if(GetDomain(oPC, 1, nClass) == DOMAIN_ANIMAL || GetDomain(oPC, 2, nClass) == DOMAIN_ANIMAL) { bAnimalDomain = TRUE; } } } // Reward extra gold if(bAnimalDomain == TRUE) { GiveGoldToCreature(oPC, 500); SendMessageToPC(oPC, "Reward for having the Animal domain."); }}
### See Also
functions:  |  GetSpecialization  

constants:  |   DOMAIN_* Constant Group
