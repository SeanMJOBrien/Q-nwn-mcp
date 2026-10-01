<!-- Source: https://nwnlexicon.com/index.php?title=ResManFindPrefix&amp;action=history -->

# ResManFindPrefix(string, int, int, int, string)

Finds the nNth available resref starting with sPrefix. 
string ResManFindPrefix( string sPrefix, int nResType, int nNth = 1, int bSearchBaseData = FALSE, string sOnlyKeyTable = "");
### Parameters 

sPrefix
    resref prefix to filter resref list with 

nResType
    blueprint RESTYPE constant for the blueprint 

nNth
    blueprint resource index 

bSearchBaseData
    optional parameter to specify searching base game resrefs 

sOnlyKeyTable
    optional parameter to specify keytable to search
### Description
Finds the nNth available resref starting with sPrefix. Returns "" if no such resref exists. 
The returned resref does not include the file suffix 
Set bSearchBaseData to TRUE to also search base game content stored in your game installation directory. 
  * WARNING: This can be very slow.
  * PW/Server Devs: bSearchBaseData, when used in a server-environment, only searches the server's files when producing results. You would need to extract the base game files and add them to the server's override folder for this function to pick up those files.

Set sOnlyKeyTable to a specific keytable to only search the given named keytable (e.g. "OVERRIDE:"). 
### Remarks
Does not return the resrefs in any particular order. This is because the resman data is iterated over and all manner of restypes in all kinds of order are there, just added as and when they are found. 
This can be pretty slow even if bSearchBaseData is FALSE if there is a lot of hakpack or other content sources. The reason it is slow is that there are potentially tens or hundreds of thousands of files to iterate over, and when nNth grows high enough the iteration to find the higher values (which always starts from scratch) can search more and more of the data since it's in no particular order. 
If you need data like "how many head models there are for this particular gender/race" generating this data offline for an sqlite DB or caching it at OnModuleLoad might be a good idea. 
### Version
This function was added in 1.85.8193.31 of NWN:EE. 
### Example
// Execute all scripts that start with "load_"void main(){ int i = 1; string sScript = ResManFindPrefix("load_", RESTYPE_NCS, i); while (sScript != "") { ExecuteScript(sScript, OBJECT_SELF); sScript = ResManFindPrefix("load_", RESTYPE_NCS, ++i); }}
### See Also
functions:  | ResManGetAliasFor() TemplateToJson()
