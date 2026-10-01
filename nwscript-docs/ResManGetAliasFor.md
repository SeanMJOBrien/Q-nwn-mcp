<!-- Source: https://nwnlexicon.com/index.php?title=ResManGetAliasFor&amp;action=history -->

# ResManGetAliasFor(string, int)

Returns the resource location of sResRef.nResType, as seen by the running module. 
string ResManGetAliasFor( string sResRef, int nResType);
### Parameters 

sResRef
    blueprint resref to query location 

nResType
    blueprint RESTYPE constant for the blueprint resref
### Description
Returns the resource location of sResRef.nResType, as seen by the running module. 
Returns "" if the resource does not exist in the search space. 
Note for dedicated servers: Checks on the module/server side, not the client. 
### Remarks
This is an immensely useful function to check for the presence of a blueprint resref for CreateObject, a particular item part for CopyItemAndModify, creature body parts for SetCreatureBodyPart or any form of JSON creation of items/creatures/placeables in combination with Get2DAString calls. 
Note you cannot read metadata from the resource (eg; the textures in use by a model) for instance for SetTextureOverride. 
This is significantly faster than ResManFindPrefix when iterating over known filenames. 
### Version
This function was added in 1.85.8193.31 of NWN:EE. 
### Example
// Helper function see below.string IntToPaddedString(int nX, int nLength = 4, int nSigned = FALSE);// See if the given Human, Male, Phenotype 0 head model exists, since there is no 2da file to determine valid heads// We then set our head to that appearancevoid main(){ // Does the given head ID exist? int nHead = 10; // Full name in this example is "pmh0_head010" if(ResManGetAliasFor("pmh0_head" + IntToPaddedString(nHead, 3), RESTYPE_MDL) != "") { SetCreatureBodyPart(CREATURE_PART_HEAD, nHead, OBJECT_SELF); }}// Converts the given integer to string as IntToString and then pads the left side until// it's nLength characters long. If sign is specified, the first character is reserved// for it, and it is always present.// Strings longer than the given length are truncated to their nLength right characters.// Examples:// IntToPaddedString(-15, 4, FALSE) = "0015"// IntToPaddedString(-15, 4, TRUE) = "-015"string IntToPaddedString(int nX, int nLength = 4, int nSigned = FALSE){ if(nSigned) nLength--; // To allow for sign string sResult = IntToString(nX); // Trunctate to nLength rightmost characters if(GetStringLength(sResult) > nLength) sResult = GetStringRight(sResult, nLength); // Pad the left side with zero while(GetStringLength(sResult) < nLength) { sResult = "0" + sResult; } if(nSigned) { if(nX >= 0) sResult = "+" + sResult; else sResult = "-" + sResult; } return sResult;}
### See Also
functions:  | TemplateToJson() ResManFindPrefix()
