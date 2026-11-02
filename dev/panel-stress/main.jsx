import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import TechniquePanel from '../../src/components/sudoku/panel/TechniquePanel';
import TechniqueBrowser from '../../src/components/sudoku/panel/TechniqueBrowser';
import TechniqueModal from '../../src/components/sudoku/TechniqueModal';
import { TECHNIQUES, TIERS } from './stressCatalog.js';
import { FIXTURES } from './fixtures.js';
import '../../src/index.css';

// Which state, and whether the tiers start open: both in the URL, so a
// reload keeps what was being looked at.
const params = new URLSearchParams(window.location.search);
const startState = FIXTURES[params.get('data')] ? params.get('data') : 'demo';
if (params.get('tiers') !== 'closed') {
  // The defect this harness exists for is inside an open tier, so they open.
  window.localStorage.setItem(
    'sudoku-mentor:technique-tiers-open',
    JSON.stringify(TIERS.map((tier) => tier.level))
  );
} else {
  window.localStorage.removeItem('sudoku-mentor:technique-tiers-open');
}

// The panel's real container, per useArrangement: 380px in the wide
// arrangement, 300px in the medium one, and the full width of the sheet
// below that. A sidebar list is not a full-page list.
const columnWidth = () => {
  const w = window.innerWidth;
  if (w >= 1200) return 380;
  if (w >= 960) return 300;
  return Math.min(w - 32, 420);
};

const chrome = {
  bar: {
    position: 'fixed',
    bottom: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 90,
    display: 'flex',
    gap: 4,
    padding: 4,
    borderRadius: 999,
    background: '#e5e7eb',
    font: '12px/1.2 system-ui, sans-serif',
    color: '#111827',
    boxShadow: '0 2px 8px rgba(0,0,0,.3)',
    maxWidth: 'calc(100vw - 24px)',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  seg: (on) => ({
    border: 0,
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: 999,
    background: on ? '#fff' : 'transparent',
    fontWeight: on ? 600 : 400,
    color: '#111827',
  }),
  note: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 90,
    padding: '6px 12px',
    background: '#111827',
    color: '#e5e7eb',
    font: '12px/1.4 system-ui, sans-serif',
  },
};

function Harness() {
  const [state, setState] = useState(startState);
  const [expanded, setExpanded] = useState(true);
  const [browse, setBrowse] = useState(null);
  const [technique, setTechnique] = useState(null);
  const [width, setWidth] = useState(columnWidth);
  React.useEffect(() => {
    const onResize = () => setWidth(columnWidth());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fixture = FIXTURES[state];
  const pick = (key) => {
    setState(key);
    const next = new URLSearchParams(window.location.search);
    next.set('data', key);
    window.history.replaceState(null, '', `?${next}`);
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#0f172a', padding: '34px 16px 64px' }}>
      <p style={chrome.note}>
        {TECHNIQUES.length} techniques · column {width}px · {fixture.note}
      </p>
      <div style={{ width, maxWidth: '100%', marginInline: 'auto' }} data-testid="panel-column">
        <TechniquePanel
          expanded={expanded}
          onToggleExpanded={() => setExpanded((v) => !v)}
          counting={false}
          searchingForcingChain={false}
          noAssistMode={false}
          onSelectTechnique={setTechnique}
          onHighlight={() => {}}
          onBrowse={setBrowse}
          onCountTier={() => {}}
          onUltimateScan={() => {}}
          onWhatIfSearch={() => {}}
          onShowInfo={() => {}}
          {...fixture.props}
        />
      </div>

      <TechniqueBrowser
        browse={browse}
        counts={fixture.props.counts}
        noAssistMode={!!fixture.props.noAssistMode}
        uniqueness={fixture.props.uniqueness}
        onSelectTechnique={setTechnique}
        onClose={() => setBrowse(null)}
      />
      {technique && (
        <TechniqueModal
          technique={technique}
          count={fixture.props.counts[technique]}
          noAssistMode={!!fixture.props.noAssistMode}
          uniqueness={fixture.props.uniqueness}
          onCount={() => {}}
          onClose={() => setTechnique(null)}
        />
      )}

      <div style={chrome.bar} role="group" aria-label="Demo data or worst case">
        {Object.entries(FIXTURES).map(([key, f]) => (
          <button key={key} onClick={() => pick(key)} style={chrome.seg(key === state)}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Harness />);
