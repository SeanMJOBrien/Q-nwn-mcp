<!-- Source: https://nwnlexicon.com/index.php/ApplyEffectAtLocation -->

# ApplyEffectAtLocation(int, effect, location, float)
Applies an effect at a location. 
void ApplyEffectAtLocation( int nDurationType, effect eEffect, location lLocation, float fDuration = 0.0f);

### Parameters 

nDurationType
    A DURATION_TYPE_* constant. 

eEffect
    The effect you want to apply. 

lLocation
    The location where you want to apply the effect. 

fDuration
    The duration (in seconds) of the effect. (Default: 0.0f)
### Description
ApplyEffectAtLocation applies an effect at a location, and is most often used to apply EffectVisualEffect() and EffectAreaOfEffect(). 
The nDurationType depends on the Effect you construct; refer to individual effects' reference for details of which duration types can and cannot be used with an effect. 
If the nDurationType is DURATION_TYPE_INSTANT or DURATION_TYPE_PERMANENT, then the last parameter, fDuration, is ignored. 
For your own sanity it is worth using TagEffect to make an effect uniquely identifiable later unless it is a temporary or spell script effect. 
### Remarks
Since most effects affect objects, many will have no effect when applied at a Location. Use this function to apply Visual and Area of Effect effects. For example, you can use this to apply the visual effect of a spell, where none has been cast. 
Because you can only apply certain effects with this function, it is likely you should never need EffectLinkEffects(), because you have no target to resist or remove the effects from later. 
For this, the only Effect functions you will ever be able to use are likely to be EffectVisualEffect() and EffectAreaOfEffect(), EffectSummonCreature(), and EffectSwarm(). No other effects should work with this function, as they require a target. 
### Known Bugs
The timing element of this function is inoperative with the darkness constant. You can set it for 1 second or set it for 20 seconds, and the effect still plays for the same period of time. However, if you use ApplyEffectToObject(), the timing element will work. 
When used with the VFX_DUR_GHOST_SMOKE_2 constant, the effect created is permanent no matter what the nDurationType and fDuration parameters are set to. 
### Version
1.62 
### Example
// In a triggers' OnEnter script, this creates a nasty area of web// for 10 seconds at the PC's location.void main(){ // Get the PC's location // - we use location - if we applied it directly to the PC, the // web will actually move around with it! location lPC = GetLocation(GetEnteringPC()); // Declare the effect effect eEffect = EffectVisualEffect(VFX_DUR_WEB_MASS); // Apply it for 10 seconds, ooh, sticky - or was it an illusion? ApplyEffectAtLocation(DURATION_TYPE_TEMPORARY, eEffect, lPC, 10.0);}// We apply an instant Meteor Swarm (see visual effect constants// section for picture) at the location of a waypoint, tagged as// "WP_STORM". This could be in a lever script or something.void main(){ // Get the waypoint and its location - we can NOT use the // waypoint directly, it will likely not work, and is pointless. location lTarget = GetLocation(GetWaypointByTag("WP_STORM")); // Declare the instant visual effect effect eVis = EffectVisualEffect(VFX_FNF_METEOR_SWARM); // Apply it (instantly) at the location of the waypoint. ApplyEffectAtLocation(DURATION_TYPE_INSTANT, eVis, lTarget);}
### See Also
functions:  | ApplyEffectToObject  

constants:  | DURATION_TYPE_* Constants
