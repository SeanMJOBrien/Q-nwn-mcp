<!-- Source: https://nwnlexicon.com/index.php?title=GetEffectLinkId&amp;action=history -->

# GetEffectLinkId(effect)

Returns the given effects Link ID. 
string GetEffectLinkId( effect eEffect);
#### Parameters 

eEffect
    The effect to query for a Link ID.
#### Description
Returns the given effect's Link ID. There is no guarantees about this identifier other than it is unique and the same for all effects linked to it. 
#### Remarks
Using RemoveEffect on an effect will remove all effects with the same Link ID. Even if no EffectLinkEffects is used an individual effect will have a link ID. 
You can use this to emulate EffectDispelMagicAll and similar effects since you only need to run one caster level check against each spell, not each individual effect (Mage Armor for instance applies 5 different effects linked together). 
The function returns a 64bit integer in hex form (minus the 0x prefix) since nwscript can't return a full 64bit integer. The game increments each time an effect is generated so it has a unique enough ID for that session for that particular set of effects on a particular creature. 
**Note:** If you apply the same effect twice to the same object you'll get the same link ID - see example below. So don't do this - Bioware never did. You can have link IDs the same across different creatures for the same reason (though this should be fine). If you need a very unique identifier instead use TagEffect (or regenerate the effect link from scratch each time). 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
This function was updated in 1.87.8193.36 of NWN:EE. Fixed effect links not being retained after relogging on a server. 
#### Example
// Applying the same effect twice on the same object will have the same link ID for both, even though they're not intended to be fully linked.effect eHP = EffectTemporaryHitpoints(10);effect eDur = EffectVisualEffect(VFX_DUR_AURA_BLUE);effect eLink = EffectLinkEffects(eHP, eDur);ApplyEffectToObject(DURATION_TYPE_PERMANENT, eLink, OBJECT_SELF);ApplyEffectToObject(DURATION_TYPE_PERMANENT, eLink, OBJECT_SELF);// Now looping effects will have both temporary hitpoint effects having the same link ID
#### See Also
functions:  | EffectDispelMagicAll EffectDispelMagicBest GetEffectCasterLevel RemoveEffect
