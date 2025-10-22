const buildStateGraph = process => {
  const lines = ['digraph process {', '  rankdir=LR;'];

  for (const [stateKey, state] of Object.entries(process.states)) {
    const label = state.name || stateKey;
    const shape = state.is_final ? 'doublecircle' : 'circle';
    lines.push(`  "${stateKey}" [label="${label}", shape=${shape}];`);
  }

  for (const response of process.responses) {
    const target = response.transitions_to;
    if (target) {
      lines.push(`  "pending" -> "${target}" [label="${response.pruefidentifikator}"];`);
    }
  }

  lines.push('}');
  return lines.join('\n');
};

module.exports = { buildStateGraph };
