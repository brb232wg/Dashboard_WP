const fmtDelta = (delta) => `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`;

export function renderBottomMarketStrip(container, markets = {}) {
  if (!markets.brent || !markets.wti || !markets.polymarket) return;

  container.innerHTML = `
    <div class="tile"><div class="tileHeader"><div class="tileTitle">Brent</div></div><div class="tileBody"><div class="v">$${markets.brent.value.toFixed(2)}</div><div class="k">Δ ${fmtDelta(markets.brent.delta || 0)}</div></div></div>
    <div class="tile"><div class="tileHeader"><div class="tileTitle">WTI</div></div><div class="tileBody"><div class="v">$${markets.wti.value.toFixed(2)}</div><div class="k">Δ ${fmtDelta(markets.wti.delta || 0)}</div></div></div>
    <div class="tile"><div class="tileHeader"><div class="tileTitle">${markets.polymarket.label}</div></div><div class="tileBody"><div style="display:flex;justify-content:space-between;"><span>YES ${(markets.polymarket.yes*100).toFixed(0)}%</span><span>NO ${(markets.polymarket.no*100).toFixed(0)}%</span></div><div class="k">Updated ${new Date(markets.polymarket.updated_at).toLocaleTimeString()}</div></div></div>
  `;
}
