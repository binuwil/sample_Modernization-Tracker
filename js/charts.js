/**
 * USPS DFA Tracker - Zero-Dependency SVG Charting Engine
 * Visualizes transition disruption dips, stem-time distributions, and rollout status.
 */

export class ChartRenderer {
  constructor() {
    this.svgNS = "http://www.w3.org/2000/svg";
  }

  /**
   * Renders the Facility Transition Disruption Trajectory curve.
   */
  renderTransitionCurve(containerId, facilityName = "Palmetto RPDC (Atlanta)") {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const width = container.clientWidth || 380;
    const height = 220;
    const padL = 40;
    const padR = 20;
    const padT = 20;
    const padB = 30;

    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    // Simulated weekly on-time trajectory around facility activation (T-4 to T+8)
    const points = [
      { t: "-4w", val: 93.2 },
      { t: "-2w", val: 92.8 },
      { t: "Launch", val: 84.5 },
      { t: "+2w", val: 74.2 }, // Bottom of the transition dip
      { t: "+4w", val: 78.6 },
      { t: "+6w", val: 86.4 },
      { t: "+8w", val: 90.8 },
      { t: "+10w", val: 92.5 }
    ];

    const minY = 65;
    const maxY = 100;
    const scaleY = (v) => padT + plotH - ((v - minY) / (maxY - minY)) * plotH;
    const scaleX = (idx) => padL + (idx / (points.length - 1)) * plotW;

    const svg = document.createElementNS(this.svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");

    // Y Grid lines (70, 80, 90, 95)
    [70, 80, 90, 95].forEach(tick => {
      const y = scaleY(tick);
      const line = document.createElementNS(this.svgNS, "line");
      line.setAttribute("x1", padL);
      line.setAttribute("y1", y);
      line.setAttribute("x2", width - padR);
      line.setAttribute("y2", y);
      line.setAttribute("stroke", tick === 95 ? "rgba(245, 158, 11, 0.4)" : "rgba(255, 255, 255, 0.06)");
      line.setAttribute("stroke-width", "1");
      if (tick === 95) line.setAttribute("stroke-dasharray", "3 3");
      svg.appendChild(line);

      const text = document.createElementNS(this.svgNS, "text");
      text.setAttribute("x", padL - 6);
      text.setAttribute("y", y + 3);
      text.setAttribute("text-anchor", "end");
      text.setAttribute("fill", tick === 95 ? "#f59e0b" : "var(--text-dim)");
      text.setAttribute("font-size", "9");
      text.setAttribute("font-family", "monospace");
      text.textContent = `${tick}%`;
      svg.appendChild(text);
    });

    // Draw Line and Gradient Area
    let lineD = "";
    let areaD = "";
    points.forEach((pt, idx) => {
      const x = scaleX(idx);
      const y = scaleY(pt.val);
      lineD += (idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
      areaD += (idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
    });

    const lastX = scaleX(points.length - 1);
    const firstX = scaleX(0);
    const baseY = scaleY(minY);
    areaD += ` L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;

    // Defs & Gradient
    const defs = document.createElementNS(this.svgNS, "defs");
    const grad = document.createElementNS(this.svgNS, "linearGradient");
    grad.setAttribute("id", "dipGrad");
    grad.setAttribute("x1", "0");
    grad.setAttribute("y1", "0");
    grad.setAttribute("x2", "0");
    grad.setAttribute("y2", "1");
    grad.innerHTML = `
      <stop offset="0%" stop-color="#ef4444" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ef4444" stop-opacity="0.0"/>
    `;
    defs.appendChild(grad);
    svg.appendChild(defs);

    const areaPath = document.createElementNS(this.svgNS, "path");
    areaPath.setAttribute("d", areaD);
    areaPath.setAttribute("fill", "url(#dipGrad)");
    svg.appendChild(areaPath);

    const linePath = document.createElementNS(this.svgNS, "path");
    linePath.setAttribute("d", lineD);
    linePath.setAttribute("fill", "none");
    linePath.setAttribute("stroke", "#ef4444");
    linePath.setAttribute("stroke-width", "2");
    svg.appendChild(linePath);

    // Points & Labels
    points.forEach((pt, idx) => {
      const x = scaleX(idx);
      const y = scaleY(pt.val);

      const circle = document.createElementNS(this.svgNS, "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", "3.5");
      circle.setAttribute("fill", pt.val < 80 ? "#ef4444" : (pt.val < 90 ? "#f59e0b" : "#10b981"));
      circle.setAttribute("stroke", "#ffffff");
      circle.setAttribute("stroke-width", "1");

      const title = document.createElementNS(this.svgNS, "title");
      title.textContent = `${pt.t}: ${pt.val}% on-time`;
      circle.appendChild(title);
      svg.appendChild(circle);

      // X Label
      const xLabel = document.createElementNS(this.svgNS, "text");
      xLabel.setAttribute("x", x);
      xLabel.setAttribute("y", height - 10);
      xLabel.setAttribute("text-anchor", "middle");
      xLabel.setAttribute("fill", "var(--text-dim)");
      xLabel.setAttribute("font-size", "9");
      xLabel.textContent = pt.t;
      svg.appendChild(xLabel);
    });

    container.appendChild(svg);
  }

  /**
   * Renders the Carrier Stem-Time & Distance Distribution bar chart.
   */
  renderStemTimeDistribution(containerId, facilities) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const spokes = facilities.filter(f => f.type === 'SPOKE' && f.distance_to_sdc);
    const bins = [
      { label: "< 10 mi", count: 0, penalty: "Low (<20m)", color: "#10b981" },
      { label: "10-20 mi", count: 0, penalty: "Mod (25-35m)", color: "#38bdf8" },
      { label: "20-30 mi", count: 0, penalty: "High (40-50m)", color: "#f59e0b" },
      { label: "30+ mi", count: 0, penalty: "Severe (>55m)", color: "#ef4444" },
    ];

    spokes.forEach(s => {
      const d = s.distance_to_sdc;
      if (d < 10) bins[0].count++;
      else if (d < 20) bins[1].count++;
      else if (d < 30) bins[2].count++;
      else bins[3].count++;
    });

    const maxCount = Math.max(...bins.map(b => b.count), 1);
    const width = container.clientWidth || 380;
    const height = 180;
    const padL = 70;
    const padR = 40;
    const barH = 22;
    const gap = 12;

    const svg = document.createElementNS(this.svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");

    bins.forEach((b, idx) => {
      const y = idx * (barH + gap) + 18;
      const barW = (b.count / maxCount) * (width - padL - padR);

      // Label
      const label = document.createElementNS(this.svgNS, "text");
      label.setAttribute("x", padL - 10);
      label.setAttribute("y", y + barH / 2 + 4);
      label.setAttribute("text-anchor", "end");
      label.setAttribute("fill", "var(--text-muted)");
      label.setAttribute("font-size", "10");
      label.textContent = b.label;
      svg.appendChild(label);

      // Background
      const bg = document.createElementNS(this.svgNS, "rect");
      bg.setAttribute("x", padL);
      bg.setAttribute("y", y);
      bg.setAttribute("width", width - padL - padR);
      bg.setAttribute("height", barH);
      bg.setAttribute("rx", "4");
      bg.setAttribute("fill", "#1e293b");
      svg.appendChild(bg);

      // Value bar
      const fill = document.createElementNS(this.svgNS, "rect");
      fill.setAttribute("x", padL);
      fill.setAttribute("y", y);
      fill.setAttribute("width", barW);
      fill.setAttribute("height", barH);
      fill.setAttribute("rx", "4");
      fill.setAttribute("fill", b.color);
      svg.appendChild(fill);

      // Count text
      const countText = document.createElementNS(this.svgNS, "text");
      countText.setAttribute("x", padL + barW + 8);
      countText.setAttribute("y", y + barH / 2 + 4);
      countText.setAttribute("fill", "#ffffff");
      countText.setAttribute("font-size", "10");
      countText.setAttribute("font-weight", "bold");
      countText.setAttribute("font-family", "monospace");
      countText.textContent = `${b.count} (${Math.round((b.count / (spokes.length || 1)) * 100)}%)`;
      svg.appendChild(countText);
    });

    container.appendChild(svg);
  }
}
