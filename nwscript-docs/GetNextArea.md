<!-- Source: https://nwnlexicon.com/index.php/GetNextArea -->

# GetNextArea()

Returns the next area in the module. 
object GetNextArea();

### Description
Returns the next area in the module (after GetFirstArea), or OBJECT_INVALID if no more areas are loaded. 
### Remarks
 | This section of the article is a stub. You can help the NWN Lexicon by expanding it.   

### Version
This function was added in 1.74.8149 of NWN:EE. 
```
Note that the description of this function was omitted from the PDF release notes. The function is described in a readme in the lang/<language>/docs directory delivered with Neverwinter Nights Enhanced Edition, and in the toolset script editor.

```

### Example
//Prints the name of all areas in a module to log.void main() { object oArea = GetFirstArea(); while (GetIsObjectValid(oArea)) { WriteTimestampedLogEntry(GetName(oArea)); oArea = GetNextArea(); }}
### See Also
functions:  | GetFirstArea()
