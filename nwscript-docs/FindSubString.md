<!-- Source: https://nwnlexicon.com/index.php?title=FindSubString&amp;action=history -->

# FindSubString(string, string)
Returns the position of sSubstring in sString. 
int FindSubString( string sString, string sSubString int nStart = 0);

### Parameters 

sString
    The string you are searching within. 

sSubString
    The string you are searching sString for. 

nStart
    The character position to start searching at (from the left end of the string). (Default = 0)
### Description
Returns an integer value representing the position of sSubstring in sString. The search is case sensitive. 
Returns a base zero index of where sSubstring starts in sString if found. 
Returns -1 if sSubstring is not found to exist in sString. 
### Version
1.69 
### Example
//Example 1 - The following would return a value of 0.int nPostion = FindSubString("testing","test");//Example 2 - The following would return a value of 1.int nPostion = FindSubString("testing","est");//Example 3 - The following would return a value of -1.int nPostion = FindSubString("testing","mike");//Example 4 - The following would return a value of -1.int nPostion = FindSubString("testing","Test");//Example 5 - The following would return a value of 4.int nPostion = FindSubString("testing","ing", 4); //Example 6 - The following would return a value of -1.int nPostion = FindSubString("testing","ing", 5);
### See Also
functions:  | TestStringAgainstPattern()
