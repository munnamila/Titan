import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import './App.css'

const TODAY = new Date().toISOString().split('T')[0]

function loadData() {
  return {
    habits: JSON.parse(localStorage.getItem('habits') || '[]'),
    records: JSON.parse(localStorage.getItem('records') || '{}'),
  }
}
function saveHabits(h) { localStorage.setItem('habits', JSON.stringify(h)) }
function saveRecords(r) { localStorage.setItem('records', JSON.stringify(r)) }

function lastNDays(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().split('T')[0]
  })
}

// 按周聚合：返回近 n 周，每周得分总和
function lastNWeeks(n, records, habitMap) {
  return Array.from({ length: n }, (_, wi) => {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - (n - 1 - wi) * 7 - weekStart.getDay())
    const label = `第${n - wi}周前`.replace('第1周前', '本周')
    let score = 0
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + d)
      const key = day.toISOString().split('T')[0]
      const ids = records[key] || []
      score += ids.reduce((s, id) => s + (habitMap[id]?.score || 0), 0)
    }
    return { label, score }
  })
}

// 按月聚合：返回近 n 月，每月得分总和
function lastNMonths(n, records, habitMap) {
  return Array.from({ length: n }, (_, mi) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (n - 1 - mi))
    const year = d.getFullYear()
    const month = d.getMonth()
    const label = `${year}-${String(month + 1).padStart(2, '0')}`
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    let score = 0
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const ids = records[key] || []
      score += ids.reduce((s, id) => s + (habitMap[id]?.score || 0), 0)
    }
    return { label, score }
  })
}

export default function App() {
  const [habits, setHabits] = useState([])
  const [records, setRecords] = useState({})
  const [newName, setNewName] = useState('')
  const [newScore, setNewScore] = useState('')
  const [tab, setTab] = useState('today')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editScore, setEditScore] = useState('')

  useEffect(() => {
    const { habits, records } = loadData()
    setHabits(habits)
    setRecords(records)
  }, [])

  const todayCheckins = records[TODAY] || []
  const habitMap = Object.fromEntries(habits.map(h => [h.id, h]))

  const todayScore = habits
    .filter(h => todayCheckins.includes(h.id))
    .reduce((sum, h) => sum + (h.score || 0), 0)

  function toggle(id) {
    const current = records[TODAY] || []
    const updated = current.includes(id) ? current.filter(x => x !== id) : [...current, id]
    const newRecords = { ...records, [TODAY]: updated }
    setRecords(newRecords)
    saveRecords(newRecords)
  }

  function addHabit() {
    const name = newName.trim()
    const score = parseInt(newScore) || 1
    if (!name) return
    const updated = [...habits, { id: Date.now().toString(), name, score }]
    setHabits(updated)
    saveHabits(updated)
    setNewName('')
    setNewScore('')
  }

  function deleteHabit(id) {
    if (!confirm('删除这个打卡项目？')) return
    const updated = habits.filter(h => h.id !== id)
    setHabits(updated)
    saveHabits(updated)
  }

  function startEdit(h) {
    setEditingId(h.id)
    setEditName(h.name)
    setEditScore(String(h.score || 1))
  }

  function saveEdit() {
    const name = editName.trim()
    const score = parseInt(editScore) || 1
    if (!name) return
    const updated = habits.map(h => h.id === editingId ? { ...h, name, score } : h)
    setHabits(updated)
    saveHabits(updated)
    setEditingId(null)
  }

  const historyDays = Object.keys(records)
    .sort((a, b) => b.localeCompare(a))
    .map(date => {
      const ids = records[date]
      const score = ids.reduce((sum, id) => sum + (habitMap[id]?.score || 0), 0)
      return { date, ids, score }
    })
    .filter(d => d.ids.length > 0)

  const [chartRange, setChartRange] = useState('day')

  // 折线图数据
  const lineDataDay = lastNDays(14).map(date => {
    const ids = records[date] || []
    const score = ids.reduce((sum, id) => sum + (habitMap[id]?.score || 0), 0)
    return { label: date.slice(5), score }
  })
  const lineDataWeek = lastNWeeks(8, records, habitMap)
  const lineDataMonth = lastNMonths(6, records, habitMap)

  // 饼图数据：每个习惯的总完成次数
  const pieData = habits.map(h => ({
    name: h.name,
    value: Object.values(records).filter(ids => ids.includes(h.id)).length
  })).filter(d => d.value > 0)

  return (
    <div className="app">
      <header>
        <h1>每日打卡</h1>
        <nav>
          <button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>今天</button>
          <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>记录</button>
        </nav>
      </header>

      {tab === 'today' && (
        <main>
          <p className="date">{TODAY}</p>
          <div className="score-banner">今日得分 <strong>{todayScore}</strong></div>
          <ul className="habit-list">
            {habits.length === 0 && <li className="empty">还没有打卡项目，添加一个吧</li>}
            {habits.map(h => {
              const done = todayCheckins.includes(h.id)
              const isEditing = editingId === h.id
              return (
                <li key={h.id} className={done && !isEditing ? 'done' : ''}>
                  {isEditing ? (
                    <div className="edit-row">
                      <input className="edit-name" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                      <input className="edit-score" type="number" min="1" value={editScore} onChange={e => setEditScore(e.target.value)} />
                      <button className="save-btn" onClick={saveEdit}>保存</button>
                      <button className="cancel-btn" onClick={() => setEditingId(null)}>✕</button>
                    </div>
                  ) : (
                    <>
                      <button className="check-btn" onClick={() => toggle(h.id)}>{done ? '✓' : ''}</button>
                      <span className="habit-name">{h.name}</span>
                      <span className="habit-score">+{h.score || 1}</span>
                      <button className="edit-btn" onClick={() => startEdit(h)}>✎</button>
                      <button className="delete-btn" onClick={() => deleteHabit(h.id)}>✕</button>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="add-row">
            <input placeholder="习惯名称..." value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()} />
            <input className="score-input" placeholder="分数" type="number" min="1" value={newScore} onChange={e => setNewScore(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()} />
            <button onClick={addHabit}>添加</button>
          </div>
        </main>
      )}

      {tab === 'history' && (
        <main>
          {historyDays.length === 0 && <p className="empty">还没有打卡记录</p>}

          {historyDays.length > 0 && (
            <>
              {/* 折线图 */}
              <div className="chart-card">
                <div className="chart-header">
                  <p className="chart-title">得分趋势</p>
                  <div className="chart-tabs">
                    {[['day','14天'],['week','8周'],['month','6月']].map(([key, label]) => (
                      <button key={key} className={chartRange === key ? 'active' : ''} onClick={() => setChartRange(key)}>{label}</button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={chartRange === 'day' ? lineDataDay : chartRange === 'week' ? lineDataWeek : lineDataMonth}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone" dataKey="score"
                      stroke={chartRange === 'day' ? '#4CAF50' : chartRange === 'week' ? '#2196F3' : '#FF9800'}
                      strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="得分"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 列表 */}
              <p className="section-title">每日明细</p>
              {historyDays.map(({ date, ids, score }) => (
                <div key={date} className="history-card">
                  <div className="history-header">
                    <p className="history-date">{date}</p>
                    <span className="history-score">{score} 分</span>
                  </div>
                  <div className="chips">
                    {ids.filter(id => habitMap[id]).map(id => (
                      <span key={id} className="chip">✓ {habitMap[id].name} +{habitMap[id].score || 1}</span>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </main>
      )}
    </div>
  )
}
