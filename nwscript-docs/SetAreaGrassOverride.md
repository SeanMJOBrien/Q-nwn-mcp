<!-- Source: https://nwnlexicon.com/index.php/SetAreaGrassOverride -->

# SetAreaGrassOverride(object oArea, int nMaterialId, string sTexture, float fDensity, float fHeight, vector vAmbientColor, vector vDiffuseColor)

Sets a grass override for nMaterialId in oArea. 
void SetAreaGrassOverride( object oArea, int nMaterialId, string sTexture, float fDensity, float fHeight, vector vAmbientColor, vector vDiffuseColor);
#### Parameters 

nMaterialId
    a surface material, see surfacemat.2da. 3 is the default grass material. 

sTexture
    the grass texture, cannot be empty. 

fDensity
    the density of the grass. 

fHeight
    the height of the grass. 

vAmbientColor
    the ambient color of the grass, xyz as RGB clamped to 0.0-1.0f per value. 

vDiffuseColor
    the diffuse color of the grass, xyz as RGB clamped to 0.0-1.0f per value.
#### Description
Sets a grass override for nMaterialId in oArea. 
#### Remarks
You can have multiple grass types per area by using different materials. 
You can add grass to areas that normally do not have grass, for example by calling this on the wood surface material(5) for an inn area. 
For convenience, here's a list of the Material IDs that exist in the default surfacemat.2da: 
```
  0 = NotDefined
  1 = Dirt
  2 = Obscuring
  3 = Grass
  4 = Stone
  5 = Wood
  6 = Water
  7 = Nonwalk
  8 = Transparent
  9 = Carpet
  10 = Metal
  11 = Puddles
  12 = Swamp
  13 = Mud
  14 = Leaves
  15 = Lava
  16 = Bottomless Pit
  17 = DeepWater
  18 = Door
  19 = Snow
  20 = Sand
  21 = Barebones
  22 = StoneBridge
  23-29 = Template
  30 = Trigger

```

Note that tilesets (especially custom tilesets) don't necessarily use these as intended or in a consistent way. 
#### Version
This function was added in 1.88.8193.36 of NWN:EE. 
#### Example
The below loops through all areas in a module and adds small/sparse grass to Dirt and Sand surfaces. 
void main(){ // Get the first area in the module, loop while valid. object oArea = GetFirstArea(); while (GetIsObjectValid(oArea)){ // Set the grass overrides. SetAreaGrassOverride(oArea, 1, "trm02_grass3d", 0.18f, 0.2f, Vector(1f, 0.7f, 0.6f), Vector(1f, 0.9f, 0.8f)); SetAreaGrassOverride(oArea, 20, "trm02_grass3d", 0.12f, 0.3f, Vector(1f, 0.7f, 0.6f), Vector(1f, 0.9f, 0.8f)); //Get the next area.  oArea = GetNextArea(); }}
#### See Also
functions:  | RemoveAreaGrassOverride")()  | SetAreaDefaultGrassDisabled()   
---|---|---  
---
