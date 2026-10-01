<!-- Source: https://nwnlexicon.com/index.php?title=SetObjectTextBubbleOverride&amp;action=history -->

# SetObjectTextBubbleOverride(object, int, string)

Sets a text override for the mouseover/tab-highlight text bubble of oObject. 
void SetObjectTextBubbleOverride( object oObject, int nMode, string sText);
#### Parameters 

oObject
    The object to apply the bubble text to. 

nMode
    The bubble text mode constant to apply to oObject. one of OBJECT_UI_TEXT_BUBBLE_OVERRIDE_* options. 

sText
    The text override to apply to the oObject's bubble text.
#### Description
Sets a text override for the mouseover/tab-highlight text bubble of oObject. 
Will currently only work on Creatures, Items and Useable Placeables. 
#### Remarks
This can be used to have an items name unchanged but additional context added to hightlighting it like, say "(empty)" added to the end of a now-empty placeables popup marking it as looted. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
This function was updated in 1.88.8193.36 of NWN:EE. SetObjectTextBubbleOverride() now works for items in inventories. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  |  OBJECT_UI_TEXT_BUBBLE_OVERRIDE_* Constants   

functions:  | GetObjectUiDiscoveryMask() SetObjectUiDiscoveryMask()
