<!-- Source: https://nwnlexicon.com/index.php/GetCenterPointOfArea -->

# GetCenterPointOfArea(object)

Approximates the central location of an area. 
location GetCenterPointOfArea( object oArea);
#### Parameters 

oArea
    Area to get center point of
#### Description
Get the (roughly) center point of an area. 
This works by going through all the objects in an area and getting their positions, so it is resource-intensive. 
#### Remarks
In NWN:EE you can now use GetAreaSize making this entirely redundant and it is **not recommended to use this function ever**. 
For 1.69 it is still not a function anybody would want to use, except perhaps for some debugging / testing. If you really need the central location of an area, I suggest you just create it yourself based on the size of the area. Assuming you store the size of all areas in two local floats on each area, called x and y, you can use the function I've written below instead. 
#### Requirements
#include "x0_i0_position"
#### Version
1.61 
#### Function Code
// Get the (roughly) center point of an area.// This works by going through all the objects in an area and// getting their positions, so it is resource-intensive.location GetCenterPointOfArea(object oArea){ float fXMax = 0.0; float fXMin = 10000.0; float fYMax = 0.0; float fYMin = 10000.0; object oTmp = OBJECT_INVALID; vector vTmp; oTmp = GetFirstObjectInArea(oArea); while (GetIsObjectValid(oTmp)) { vTmp = GetPositionFromLocation(GetLocation(oTmp)); if (vTmp.x > fXMax) fXMax = vTmp.x; if (vTmp.x < fXMin) fXMin = vTmp.x; if (vTmp.y > fYMax) fYMax = vTmp.y; if (vTmp.y < fYMin) fYMin = vTmp.y; oTmp = GetNextObjectInArea(oArea); } // We now have the max and min positions of all objects in an area. vTmp = Vector( (fXMax + fXMin)/2.0, (fYMax + fYMin)/2.0, 0.0); //PrintString("Center vector: " + VectorToString(vTmp)); return Location(oArea, vTmp, 0.0);}
#### Example
// Resource light version of this function. Requires the size// of the area to be stored as local floats on the area called x and ylocation GetCentralLocation(object oArea){ float fX=GetLocalFloat(oArea, "x"); float fY=GetLocalFloat(oArea, "y"); vector vCenter=Vector(fX/2.0, fY/2.0, 0.0); return Location(oArea, vCenter, 0.0);}
#### See Also  
---
