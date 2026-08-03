(() => {
  'use strict';
  const patches = window.__CRITTER_LIVE_PATCHES__ || (window.__CRITTER_LIVE_PATCHES__ = []);
  patches.push(
    {
      name: "lobby shows selected loadout and team",
      find: "const small=document.createElement('small');small.textContent=profile.username?`@${profile.username}`:(id==='host'?'Room host':'Connected player');",
      replace: "const small=document.createElement('small'),kitName=LOADOUTS[profile.loadoutId]?.name||'Selected Loadout',team=roomRules.mode==='pvp'?teamForPlayerId(id):'';small.textContent=`${profile.username?`@${profile.username}`:(id==='host'?'Room host':'Connected player')} • ${kitName}${team?` • TEAM ${team}`:''}`;"
    },
    {
      name: "host rules include ffa and teams controls",
      find: "  function roomRuleText(rules=roomRules){const normalized=normalizeRoomRules(rules);return normalized.mode==='pvp'?'Player vs Player • Player damage always enabled':`Co-op Extraction • Friendly fire ${normalized.friendlyFire?'enabled':'disabled'}`;}\n  function renderRoomRules(){\n    const normalized=normalizeRoomRules(roomRules),pvp=normalized.mode==='pvp';\n    if(dom.hostModeCoop)dom.hostModeCoop.checked=!pvp;if(dom.hostModePvp)dom.hostModePvp.checked=pvp;if(dom.hostFriendlyFire)dom.hostFriendlyFire.checked=!!normalized.friendlyFire&&!pvp;\n    if(dom.hostFriendlyFireRow)dom.hostFriendlyFireRow.classList.toggle('disabled',pvp);if(dom.hostFriendlyFire)dom.hostFriendlyFire.disabled=pvp;\n    if(dom.hostRulesHelp)dom.hostRulesHelp.textContent=pvp?'PvP removes AI raiders and ends when one player remains.':'Co-op Extraction keeps every player on one team.';\n    if(dom.joinRulesSummary)dom.joinRulesSummary.innerHTML=`<strong>ROOM RULES</strong><span>${roomRuleText(normalized)}</span>`;\n  }\n  function syncHostRulesFromUI(){roomRules=normalizeRoomRules({mode:dom.hostModePvp?.checked?'pvp':'coop',friendlyFire:!!dom.hostFriendlyFire?.checked});renderRoomRules();return roomRules;}",
      replace: "  function roomRuleText(rules=roomRules){const normalized=normalizeRoomRules(rules);return normalized.mode==='pvp'?`VS Arena • ${normalized.teams==='teams'?'Balanced Teams':'Free for All'} • No AI, loot, or objectives`:`Co-op Extraction • Friendly fire ${normalized.friendlyFire?'enabled':'disabled'}`;}\n  function ensureVsArenaControls(){\n    let panel=document.getElementById('hostPvpTeamPanel');\n    if(!panel&&dom.hostModePvp){panel=document.createElement('section');panel.id='hostPvpTeamPanel';panel.className='host-rules-panel';panel.innerHTML='<div class=\"host-rules-heading\"><div><span class=\"eyebrow\">VS ARENA FORMAT</span><strong>Choose free-for-all or balanced teams</strong></div><small>Teams alternate player slots between Team A and Team B.</small></div><div class=\"host-mode-grid\"><label class=\"host-mode-card\"><input id=\"hostPvpFfa\" type=\"radio\" name=\"hostPvpTeams\" value=\"ffa\" checked><span><strong>Free for All</strong><small>Every other player is a rival.</small></span></label><label class=\"host-mode-card\"><input id=\"hostPvpTeams\" type=\"radio\" name=\"hostPvpTeams\" value=\"teams\"><span><strong>Balanced Teams</strong><small>Up to four players on each team.</small></span></label></div>';\n      dom.hostFriendlyFireRow?.before(panel);panel.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{syncHostRulesFromUI();broadcastRoomRules();}));\n    }\n    if(panel){panel.hidden=!dom.hostModePvp?.checked;const teams=document.getElementById('hostPvpTeams'),ffa=document.getElementById('hostPvpFfa');if(teams)teams.checked=roomRules.teams==='teams';if(ffa)ffa.checked=roomRules.teams!=='teams';}\n  }\n  function renderRoomRules(){\n    const normalized=normalizeRoomRules(roomRules),pvp=normalized.mode==='pvp';ensureVsArenaControls();\n    if(dom.hostModeCoop)dom.hostModeCoop.checked=!pvp;if(dom.hostModePvp)dom.hostModePvp.checked=pvp;if(dom.hostFriendlyFire)dom.hostFriendlyFire.checked=!!normalized.friendlyFire&&!pvp;\n    if(dom.hostFriendlyFireRow)dom.hostFriendlyFireRow.classList.toggle('disabled',pvp);if(dom.hostFriendlyFire)dom.hostFriendlyFire.disabled=pvp;\n    if(dom.hostRulesHelp)dom.hostRulesHelp.textContent=pvp?'VS Arena uses a symmetrical no-loot map with no AI, extraction beacon, contracts, or objectives. Every player uses the loadout selected before joining.':'Co-op Extraction keeps every player on one team.';\n    if(dom.joinRulesSummary)dom.joinRulesSummary.innerHTML=`<strong>ROOM RULES</strong><span>${roomRuleText(normalized)}</span>`;\n  }\n  function syncHostRulesFromUI(){roomRules=normalizeRoomRules({mode:dom.hostModePvp?.checked?'pvp':'coop',friendlyFire:!!dom.hostFriendlyFire?.checked,teams:document.getElementById('hostPvpTeams')?.checked?'teams':'ffa'});renderRoomRules();return roomRules;}"
    },
    {
      name: "dynamic eight player lobby start button",
      find: "  function updateHostStartButton(){if(!dom.startCoopBtn)return;const openGuests=GUEST_IDS.filter(id=>hostChannels.get(id)?.readyState==='open'),readyGuests=openGuests.filter(id=>lobbyProfiles[id]);dom.startCoopBtn.disabled=readyGuests.length<1;dom.startCoopBtn.textContent=readyGuests.length?`Start ${roomRules.mode==='pvp'?'PvP Skirmish':'Co-op Drop'} • ${readyGuests.length+1}/4`:(openGuests.length?'Loading Player Profile…':'Waiting for Players…');}",
      replace: "  function updateHostStartButton(){if(!dom.startCoopBtn)return;const openGuests=GUEST_IDS.filter(id=>hostChannels.get(id)?.readyState==='open'),readyGuests=openGuests.filter(id=>lobbyProfiles[id]);dom.startCoopBtn.disabled=readyGuests.length<1;dom.startCoopBtn.textContent=readyGuests.length?`Start ${roomRules.mode==='pvp'?(roomRules.teams==='teams'?'Team VS Arena':'Free-for-All VS Arena'):'Co-op Drop'} • ${readyGuests.length+1}/${MAX_PLAYERS}`:(openGuests.length?'Loading Player Profile…':'Waiting for Players…');}"
    },
    {
      name: "dynamic eight player join status",
      find: "  function refreshJoinAction(){if(!dom.joinRoomBtn)return;const pin=cleanJoinPin(),connected=guestChannel?.readyState==='open';if(dom.joinRoomPin&&dom.joinRoomPin.value!==pin)dom.joinRoomPin.value=pin;if(connected){dom.joinRoomBtn.textContent=`Connected • ${connectedCount()}/4`;dom.joinRoomBtn.disabled=true;if(dom.joinActionHelp)dom.joinActionHelp.textContent='Connected. The host can start when the lobby is ready.';return;}if(joinBusy){dom.joinRoomBtn.textContent='Joining Room…';dom.joinRoomBtn.disabled=true;if(dom.joinActionHelp)dom.joinActionHelp.textContent='Finding the host and opening the direct connection.';return;}dom.joinRoomBtn.textContent='Join Room';dom.joinRoomBtn.disabled=false;if(dom.joinActionHelp)dom.joinActionHelp.textContent=/^\\d{6}$/.test(pin)?'Press Enter or click Join Room.':'Enter all six digits, then press Enter or click Join Room.';}",
      replace: "  function refreshJoinAction(){if(!dom.joinRoomBtn)return;const pin=cleanJoinPin(),connected=guestChannel?.readyState==='open';if(dom.joinRoomPin&&dom.joinRoomPin.value!==pin)dom.joinRoomPin.value=pin;if(connected){dom.joinRoomBtn.textContent=`Connected • ${connectedCount()}/${MAX_PLAYERS}`;dom.joinRoomBtn.disabled=true;if(dom.joinActionHelp)dom.joinActionHelp.textContent='Connected by direct WebRTC. Your currently selected loadout will be used when the host starts.';return;}if(joinBusy){dom.joinRoomBtn.textContent='Joining Room…';dom.joinRoomBtn.disabled=true;if(dom.joinActionHelp)dom.joinActionHelp.textContent='Finding the host and opening the direct connection.';return;}dom.joinRoomBtn.textContent='Join Room';dom.joinRoomBtn.disabled=false;if(dom.joinActionHelp)dom.joinActionHelp.textContent=/^\\d{6}$/.test(pin)?'Press Enter or click Join Room.':'Enter all six digits, then press Enter or click Join Room.';}"
    },
    {
      name: "eight player host creation copy",
      find: "'Creating a six-digit online room for up to four players…'",
      replace: "`Creating a six-digit online room for up to ${MAX_PLAYERS} players…`"
    },
    {
      name: "eight player invite copy",
      find: "`Send code ${roomPin} to up to three friends.`",
      replace: "`Send code ${roomPin} to up to ${MAX_PLAYERS-1} friends.`"
    },
    {
      name: "eight player full lobby toast",
      find: "toast('Lobby is full (4/4)')",
      replace: "toast(`Lobby is full (${MAX_PLAYERS}/${MAX_PLAYERS})`)"
    },
    {
      name: "eight player room full help",
      find: "'This lobby already has four players. Ask the host to create another room.'",
      replace: "'This lobby is full. Ask the host to create another room.'"
    },
    {
      name: "eight player welcome status",
      find: "setNetworkStatus('join',`Connected • ${Object.keys(currentRoster()).length}/4`,'connected','Waiting for the host to start the co-op drop.');",
      replace: "setNetworkStatus('join',`Connected • ${Object.keys(currentRoster()).length}/${MAX_PLAYERS}`,'connected',`Waiting for the host to start ${roomRules.mode==='pvp'?'the VS Arena':'the co-op drop'}. Your selected loadout is ready.`);"
    },
    {
      name: "snapshot includes arena team",
      find: "kills:p.kills,profile:p.profile,walkTime:p.walkTime",
      replace: "kills:p.kills,team:p.team||'',profile:p.profile,walkTime:p.walkTime"
    },
    {
      name: "squad hud shows teams loadouts and direct networking",
      find: "const info=document.createElement('div');const strong=document.createElement('strong');strong.textContent=p.profile?.displayName||p.id;const bar=document.createElement('i');",
      replace: "const info=document.createElement('div');const strong=document.createElement('strong');strong.textContent=`${p.profile?.displayName||p.id}${match.mode==='pvp'&&p.team?` • TEAM ${p.team}`:''}`;const bar=document.createElement('i');"
    }
  );
})();
