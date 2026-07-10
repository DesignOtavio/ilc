import React, { useEffect, useRef } from 'react';

const ScoreChart = ({ history }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const handleResize = () => drawChart();
    window.addEventListener('resize', handleResize);
    drawChart();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [history]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const rect = canvas.parentNode.getBoundingClientRect();
    canvas.width = rect.width || 400;
    canvas.height = 180;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Calcular scores históricos cumulativos
    let points = [5000];
    if (history && history.length > 0) {
      // Ordenar cronologicamente
      const sorted = [...history].reverse();
      let running = 5000;
      points = [running];

      sorted.forEach(ev => {
        if (ev.status === 'approved') {
          running = Math.max(0, Math.min(10000, running + ev.points_delta));
          points.push(running);
        }
      });
    } else {
      points = [5000, 5000];
    }

    if (points.length === 1) {
      points.push(points[0]);
    }

    const padding = { top: 20, right: 30, bottom: 25, left: 45 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Linhas de Grade
    ctx.strokeStyle = '#222d22';
    ctx.lineWidth = 1;
    ctx.font = '10px Barlow Condensed';
    ctx.fillStyle = '#B9B19A';

    const gridLines = 5;
    for (let i = 0; i < gridLines; i++) {
      const yVal = Math.round(10000 - (i * (10000 / (gridLines - 1))));
      const y = padding.top + (i * (graphHeight / (gridLines - 1)));

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(yVal, 10, y + 3);
    }

    // Traçar linha
    ctx.beginPath();
    ctx.strokeStyle = '#73B33A';
    ctx.lineWidth = 3;

    const xStep = graphWidth / (points.length - 1);
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(115, 179, 58, 0.25)');
    gradient.addColorStop(1, 'rgba(115, 179, 58, 0)');

    const fillPath = new Path2D();
    fillPath.moveTo(padding.left, height - padding.bottom);

    for (let i = 0; i < points.length; i++) {
      const x = padding.left + (i * xStep);
      const y = padding.top + graphHeight - ((points[i] / 10000) * graphHeight);

      if (i === 0) {
        ctx.moveTo(x, y);
        fillPath.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
        fillPath.lineTo(x, y);
      }
    }
    ctx.stroke();

    fillPath.lineTo(padding.left + (points.length - 1) * xStep, height - padding.bottom);
    fillPath.closePath();
    ctx.fillStyle = gradient;
    ctx.fill(fillPath);

    // Desenhar círculos nos nós
    for (let i = 0; i < points.length; i++) {
      const x = padding.left + (i * xStep);
      const y = padding.top + graphHeight - ((points[i] / 10000) * graphHeight);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#B08A47';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.strokeStyle = '#D4C08A';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  return <canvas ref={canvasRef} style={{ width: '100%', display: 'block' }}></canvas>;
};

export default ScoreChart;
