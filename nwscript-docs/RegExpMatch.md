<!-- Source: https://nwnlexicon.com/index.php?title=RegExpMatch&amp;action=history -->

# RegExpMatch(string, string, int, int)

Applies sRegExp on sValue, returning an array containing all matching groups. 
json RegExpMatch( string sRegExp, string sValue, int nSyntaxFlags = REGEXP_ECMASCRIPT, int nMatchFlags = REGEXP_FORMAT_DEFAULT);
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
Applies sRegExp on sValue, returning an array containing all matching groups. 
  * The regexp is not bounded by default (so /t/ will match "test").
  * A matching result with always return a JSON_ARRAY with the full match as the first element.
  * All matching groups will be returned as additional elements, depth-first.
  * A non-matching result will return a empty JSON_ARRAY.
  * If there was an error, the function will return JSON_NULL, with a error string filled in.
  * nSyntaxFlags is a mask of REGEXP_*
  * nMatchFlags is a mask of REGEXP_MATCH_* and REGEXP_FORMAT_*.

#### Remarks
Make sure you know regular expressions before using this - else you might end up with more problems to debug then you realise. 
There won't be large amounts of regular expression documentation on this wiki, find that elsewhere. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
RegExpMatch("[", "test value") // -> null (error: "The expression contained mismatched [ and ].")RegExpMatch("nothing", "test value") // -> []RegExpMatch("^test", "test value") // -> ["test"]RegExpMatch("^(test) (.+)$", "test value") // -> ["test value", "test", "value"]
#### See Also
functions:  |  RegExpIterate() RegExpReplace()   

constants:  |  REGEXP_*") REGEXP_MATCH_*") REGEXP_FORMAT_*")
