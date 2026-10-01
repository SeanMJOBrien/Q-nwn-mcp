<!-- Source: https://nwnlexicon.com/index.php?title=GetMicrosecondCounter&amp;action=history -->

# GetMicrosecondCounter()

Returns the current microsecond counter value. 
int GetMicrosecondCounter();
#### Description
Returns the current microsecond counter value. This value is meaningless on its own, but can be subtracted from other values returned by this function in the same script to get high resolution elapsed time: 
int nMicrosecondsStart = GetMicrosecondCounter();DoSomething();int nElapsedMicroseconds = GetMicrosecondCounter() - nMicrosecondsStart;
#### Remarks
Mainly useful for debugging how long a section of code has run so you can test script speed. While GetScriptInstructionsRemaining can show how many instructions a VM function has used it is not an exact equivalent to time itself. 
Since scripts block the game running be wary if the amount of microseconds running is anywhere near a full frame time, which at 60FPS is 0.016 seconds or 16000 microseconds. If you're having scripts run this long except at module load, try DelayCommand to split them up. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
// Start recording microsecond timerint nMicrosecondsStart = GetMicrosecondCounter();// Do something// Elapsed microsecondsint nElapsedMicroseconds = GetMicrosecondCounter() - nMicrosecondsStart;// Print debugSendMessageToPC(GetFirstPC(), "Microseconds: " + IntToString(nElapsedMicroseconds));
#### See Also
functions:  |  DelayCommand() GetScriptInstructionsRemaining() GetTickRate()
