import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'

export default function Stats() {
  const [stats, setStats] = useState(null)
  const lineRef = useRef(null)
  const barRef = useRef(null)
  const pieRef = useRef(null)

  useEffect(() => {
    window.taskys.getStats().then(setStats)
  }, [])

  useEffect(() => {
    if (!stats) return

    const textColor = '#888888'
    const gridColor = 'rgba(255,255,255,0.06)'

    // last 14 days productivity line
    const days = []
    const counts = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push(d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }))
      counts.push(stats.byDay.find((r) => r.day === key)?.count || 0)
    }
    new Chart(lineRef.current, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          label: 'Completed',
          data: counts,
          borderColor: '#ffffff',
          backgroundColor: 'rgba(255,255,255,0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#fff',
          pointRadius: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
          y: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor }, beginAtZero: true },
        },
      },
    })

    new Chart(barRef.current, {
      type: 'bar',
      data: {
        labels: stats.byProject.map((p) => p.name),
        datasets: [{
          label: 'Tasks',
          data: stats.byProject.map((p) => p.count),
          backgroundColor: 'rgba(255,255,255,0.55)',
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor }, beginAtZero: true },
          y: { ticks: { color: '#ffffff' }, grid: { display: false } },
        },
      },
    })

    const colors = { high: 'rgba(255,92,92,0.7)', medium: 'rgba(255,212,121,0.7)', low: 'rgba(255,255,255,0.35)' }
    new Chart(pieRef.current, {
      type: 'doughnut',
      data: {
        labels: ['High', 'Medium', 'Low'],
        datasets: [{
          data: stats.byPriority.map((p) => p.count),
          backgroundColor: stats.byPriority.map((p) => colors[p.priority]),
          borderColor: '#0a0a0a',
          borderWidth: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { color: '#ffffff' } } },
        cutout: '65%',
      },
    })

    return () => {
      Chart.getChart(lineRef.current)?.destroy()
      Chart.getChart(barRef.current)?.destroy()
      Chart.getChart(pieRef.current)?.destroy()
    }
  }, [stats])

  if (!stats) return null

  return (
    <div className="stats-grid">
      <div className="chart-card glass">
        <h3>Productivity — last 14 days</h3>
        <div className="chart-wrap"><canvas ref={lineRef} /></div>
      </div>
      <div className="chart-card glass">
        <h3>Tasks per project</h3>
        <div className="chart-wrap"><canvas ref={barRef} /></div>
      </div>
      <div className="chart-card glass" style={{ gridColumn: 'span 2', height: 300 }}>
        <h3>Priority distribution</h3>
        <div className="chart-wrap"><canvas ref={pieRef} /></div>
      </div>
    </div>
  )
}
