<!-- Source: https://nwnlexicon.com/index.php?title=RegExpReplace&amp;action=history -->

# RegExpReplace(string, string, int, int)

Replaces all matching sRegExp in sValue with sReplacement. 
string RegExpReplace( string sRegExp, string sValue, string sReplacement, int nSyntaxFlags = REGEXP_ECMASCRIPT, int nMatchFlags = REGEXP_FORMAT_DEFAULT);
#### Parameters 

sRegExp
    The regular expression string. 

sValue
    A string value to operate upon with the regular expression. 

sReplacement
    A replacement string. 

nSyntaxFlags
    nSyntaxFlags is a mask of REGEXP_* constants. 

nMatchFlags
    nMatchFlags is a mask of REGEXP_MATCH_* and REGEXP_FORMAT_* constants.
#### Description
Replaces all matching sRegExp in sValue with sReplacement. 
  * Returns a empty string on error.
  * Please see the format documentation for replacement patterns.
  * nSyntaxFlags is a mask of REGEXP_*
  * nMatchFlags is a mask of REGEXP_MATCH_* and REGEXP_FORMAT_*.
  * FORMAT_DEFAULT replacement patterns:

```
  $$  $
  $&  The matched substring.
  $`  The portion of string that precedes the matched substring.
  $'  The portion of string that follows the matched substring.
  $n  The nth capture, where n is a single digit in the range 1 to 9 and $n is not followed by a decimal digit.
  $nn  The nnth capture, where nn is a two-digit decimal number in the range 01 to 99.

```

#### Remarks
Make sure you know regular expressions before using this - else you might end up with more problems to debug then you realise. 
There won't be large amounts of regular expression documentation on this wiki, find that elsewhere. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
RegExpReplace("a+", "vaaalue", "[$&]") // => "v[aaa]lue"
#### See Also
functions:  |  RegExpIterate() RegExpMatch()   

constants:  |  REGEXP_*") REGEXP_MATCH_*") REGEXP_FORMAT_*")
