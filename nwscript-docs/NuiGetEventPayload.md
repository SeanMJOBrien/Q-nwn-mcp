<!-- Source: https://nwnlexicon.com/index.php/NuiGetEventPayload -->

# NuiGetEventPayload()

Returns the event payload, specific to the event. 
json NuiGetEventPayload();
#### Description
Returns the event payload, specific to the event. 
#### Remarks
Payload is Json of object type, ie you need to use JsonObjectGet or JsonObjectKeys functions to access data in it. 
Only three NUI subevents provide valid payload object: 'mousedown', 'mouseup' and 'mousescroll'. All other events returns JsonNull. 
In both 'mousedown' and 'mouseup' subevents the payload object has two keys: 'mouse_btn' which holds a JsonInt value and 'mouse_pos' which holds an another JsonObject which holds two keys: 'x' and 'y' of JsonFloat value. 
'mouse_btn' key values are: 0 - left mouse button, 1 - middle mouse button, 2 - right mouse button. It seems that special mouse buttons are not tracked. 
In 'mousescroll' subevent the payload object has these keys: first key is a 'mouse_pos' that works the same as explained above, the second key is 'mouse_scroll' that is also JsonObject type and which also holds two additional keys 'x' and 'y' of JsonFloat type. I was unabled to get 'x' key to have any other value than 0.0, the 'y' can be either 1.0 for scrolling up or -1.0 for scrolling down. 
#### Version
This function was added in 1.85.8193.31 of NWN:EE. 
#### Example
This example will play a sound of clicking when player left-clicks at specific coordinates inside NUI image (as images don't have click event, but they are generating mousedown and mouseup events). 
void main(){ //Declare major variables object oPC = NuiGetEventPlayer(); int nToken = NuiGetEventWindow(); string sEvent = NuiGetEventType(); string sElem = NuiGetEventElement(); int nIdx = NuiGetEventArrayIndex(); string sWndId = NuiGetWindowId(oPC, nToken); if(sWndId == "myshinygui") { if(sEvent == "mousedown") { json jPayload = NuiGetEventPayload(); json jKeys = JsonObjectKeys(jPayload); json jButton = JsonObjectGet(jPayload,"mouse_btn"); json jCoords = JsonObjectGet(jPayload,"mouse_pos"); json jX = JsonObjectGet(jCoords,"x"); json jY = JsonObjectGet(jCoords,"y"); float fX = JsonGetFloat(jX); float fY = JsonGetFloat(jY); int nButton = JsonGetInt(jButton); if(nButton == 0) { if(fX >= 325.0 && fX <= 340.0) { if(fY >= 5.0 && fY <= 20.0)//up button { AssignCommand(oPC,PlaySound("gui_button")); } else if(fY >= 25.0 && fY <= 40.0)//down button { AssignCommand(oPC,PlaySound("gui_button")); } } } } }}
#### See Also
functions:  |  NUI Functions
