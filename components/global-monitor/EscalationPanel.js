export function renderEscalationPanel(container, summary) {
  container.innerHTML = `
    <div class="cardHeader"><div class="cardTitle">Escalation</div><span class="pill">60m Window</span></div>
    <div class="cardBody">
      <div class="k">Escalation Meter</div>
      <div class="gmMeterTrack"><div class="gmMeterFill" style="width:${summary.escalation}%"></div></div>
      <div class="v">${summary.escalation}%</div>
      <div class="k" style="margin-top:10px;">Strike Counter</div>
      <div class="v">${summary.strikeCounter}</div>
      <div class="k" style="margin-top:10px;">Casualties Summary</div>
      <div class="v">Affected: ${summary.casualtyEstimated || 0}</div>
      <div class="v">Critical incidents: ${summary.criticalIncidents}</div>
    </div>
  `;
}
