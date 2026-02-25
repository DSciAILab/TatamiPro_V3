const bracket = { // Simplified bracket
  rounds: [
    [
      { id: 'M1', next_match_id: 'M3' }
    ],
    [
      { id: 'M2', next_match_id: 'M3', prev_match_ids: ['M1', null] }
    ],
    [
      { id: 'M3', prev_match_ids: ['M1', 'M2'] }
    ]
  ]
};

const match = bracket.rounds[0][0];
const loserId = 'Theyab_ID';

for (const round of bracket.rounds) {
  for (const m of round) {
    if (m.id === match.next_match_id) continue;
    
    if (m.prev_match_ids?.[0] === match.id) {
       m.fighter1_id = loserId; 
    } else if (m.prev_match_ids?.[1] === match.id) {
       m.fighter2_id = loserId;
    }
  }
}

const allMatches = bracket.rounds.flat();
const loserDependentMatches = allMatches.filter(m => 
    m.id !== match.id && 
    m.id !== match.next_match_id && 
    m.prev_match_ids?.includes(match.id)
);

console.log(JSON.stringify(loserDependentMatches, null, 2));
