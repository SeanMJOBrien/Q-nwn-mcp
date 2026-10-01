<!-- Source: https://nwnlexicon.com/index.php/WriteTimestampedLogEntry -->

# WriteTimestampedLogEntry

# WriteTimestampedLogEntry(string)
Records a string in the log file along with a date-time stamp. 
void WriteTimestampedLogEntry( string sLogEntry);
#### Parameters
_sLogEntry_
#### Description
Write sLogEntry as a timestamped entry into the log file 
#### Remarks
The logfile the string is printed in is called nwclientlog.txt and is located in the "logs" folder under your nwn install directory. 
#### Version
1.22 
#### Example
// This call would produce "[Fri Jul 12 12:08:03] Test" in the log fileWriteTimestampedLogEntry("Test");
#### See Also
functions:  |   PrintString
