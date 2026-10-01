<!-- Source: https://nwnlexicon.com/index.php?title=ResManGetFileContents&amp;action=history -->

# ResManGetFileContents(string, int)

Get the contents of a file as string, as seen by the server's resman. 
string ResManGetFileContents( string sResRef, int nResType, int nFormat = RESMAN_FILE_CONTENTS_FORMAT_RAW);
### Parameters 

sResRef
    blueprint resref to query for contents 

nResType
    blueprint RESTYPE constant for the blueprint resref 

nFormat
    one of RESMAN_FILE_CONTENTS_FORMAT_*
### Description
Get the contents of a file as string, as seen by the server's resman. 
Note: If the file contains binary data it will return data up to the first null byte. 
Returns "" if the file does not exist. 
### Remarks
This is primarily useful for servers who can add more files as a module is running. Some servers will use a cut down set of file stubs, which makes this less useful for binary files. 
For some data types it might be easier to view them in JSON formats. 
### Version
This function was added in 1.87.8193.35 of NWN:EE. 
This function was updated in 1.88.8193.36 of NWN:EE. ResManGetFileContents() can now return binary data in base64 or hex encoding. 
### Example
// Execute "filename.nss" from the game contents by compiling it and running it// If "filename.nss" is in the development folder resman should detect changes and it'll load the alterationsExecuteScriptChunk(ResManGetFileContents("filename", RESTYPE_NSS), GetModule(), FALSE);
### See Also
functions:  | ResManGetAliasFor() ResManFindPrefix()
