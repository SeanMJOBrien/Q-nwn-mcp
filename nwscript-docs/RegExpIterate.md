<!-- Source: https://nwnlexicon.com/index.php?title=RegExpIterate&amp;action=history -->

# RegExpIterate(string, string, int, int)

Iterates sValue with sRegExp. 
json RegExpIterate( string sRegExp, string sValue, int nSyntaxFlags = REGEXP_ECMASCRIPT, int nMatchFlags = REGEXP_FORMAT_DEFAULT);
#### Parameters 

sRegExp
    The regular expression string. 

sValue
    A string value to operate upon with the regular expression. 

nSyntaxFlags
    nSyntaxFlags is a mask of REGEXP_* constants. 

nMatchFlags
    nMatchFlags is a mask of REGEXP_MATCH_* and REGEXP_FORMAT_* constants.
#### Description
Iterates sValue with sRegExp. 
  * Returns an array of arrays; where each sub-array contains first the full match and then all matched groups.
  * Returns empty JSON_ARRAY if no matches are found.
  * If there was an error, the function will return JSON_NULL, with a error string filled in.
  * nSyntaxFlags is a mask of REGEXP_*
  * nMatchFlags is a mask of REGEXP_MATCH_* and REGEXP_FORMAT_*.

#### Remarks
Make sure you know regular expressions before using this - else you might end up with more problems to debug then you realise. 
There won't be large amounts of regular expression documentation on this wiki, find that elsewhere. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
RegExpIterate("(\\\d)(\\\S+)", "1i 2am 3 4asentence");// Outputs: [["1i", "1", "i"], ["2am", "2", "am"], ["4sentence", "4", "sentence"]]
#### See Also
functions:  |  RegExpMatch() RegExpReplace()   

constants:  |  REGEXP_*") REGEXP_MATCH_*") REGEXP_FORMAT_*")
