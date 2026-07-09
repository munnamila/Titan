import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import './App.css'

const TODAY = new Date().toISOString().split('T')[0]

const GROUPS = [
  { key: 'study',   label: '学习', color: '#2196F3', bg: '#e3f2fd', icon: '📚' },
  { key: 'life',    label: '生活', color: '#FF9800', bg: '#fff3e0', icon: '🌿' },
  { key: 'fitness', label: '健身', color: '#F44336', bg: '#fce4ec', icon: '💪' },
]
const GROUP_MAP = Object.fromEntries(GROUPS.map(g => [g.key, g]))

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
  const [newGroup, setNewGroup] = useState('study')
  const [tab, setTab] = useState('today')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editScore, setEditScore] = useState('')
  const [editGroup, setEditGroup] = useState('study')

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
    const updated = [...habits, { id: Date.now().toString(), name, score, group: newGroup }]
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
    setEditGroup(h.group || 'study')
  }

  function saveEdit() {
    const name = editName.trim()
    const score = parseInt(editScore) || 1
    if (!name) return
    const updated = habits.map(h => h.id === editingId ? { ...h, name, score, group: editGroup } : h)
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

  const lineDataDay = lastNDays(14).map(date => {
    const ids = records[date] || []
    const score = ids.reduce((sum, id) => sum + (habitMap[id]?.score || 0), 0)
    return { label: date.slice(5), score }
  })
  const lineDataWeek = lastNWeeks(8, records, habitMap)
  const lineDataMonth = lastNMonths(6, records, habitMap)

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

          {GROUPS.map(group => {
            const groupHabits = habits.filter(h => (h.group || 'study') === group.key)
            return (
              <div key={group.key} className="group-section">
                <div className="group-header" style={{ color: group.color }}>
                  <span className="group-icon">{group.icon}</span>
                  <span className="group-label">{group.label}</span>
                  <span className="group-count">
                    {groupHabits.filter(h => todayCheckins.includes(h.id)).length}/{groupHabits.length}
                  </span>
                </div>
                <ul className="habit-list">
                  {groupHabits.length === 0 && (
                    <li className="empty-group">暂无项目</li>
                  )}
                  {groupHabits.map(h => {
                    const done = todayCheckins.includes(h.id)
                    const isEditing = editingId === h.id
                    const g = GROUP_MAP[h.group || 'study']
                    return (
                      <li key={h.id} className={done && !isEditing ? 'done' : ''} style={{ '--group-color': g.color, '--group-bg': g.bg }}>
                        {isEditing ? (
                          <div className="edit-row">
                            <input className="edit-name" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                            <input className="edit-score" type="number" min="1" value={editScore} onChange={e => setEditScore(e.target.value)} />
                            <select className="edit-group" value={editGroup} onChange={e => setEditGroup(e.target.value)}>
                              {GROUPS.map(g => <option key={g.key} value={g.key}>{g.icon} {g.label}</option>)}
                            </select>
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
              </div>
            )
          })}

          <div className="add-row">
            <input placeholder="习惯名称..." value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()} />
            <input className="score-input" placeholder="分" type="number" min="1" value={newScore} onChange={e => setNewScore(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()} />
            <select className="group-select" value={newGroup} onChange={e => setNewGroup(e.target.value)}>
              {GROUPS.map(g => <option key={g.key} value={g.key}>{g.icon}</option>)}
            </select>
            <button onClick={addHabit}>添加</button>
          </div>
        </main>
      )}

      {tab === 'history' && (
        <main>
          {historyDays.length === 0 && <p className="empty">还没有打卡记录</p>}

          {historyDays.length > 0 && (
            <>
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

              <p className="section-title">每日明细</p>
              {historyDays.map(({ date, ids, score }) => (
                <div key={date} className="history-card">
                  <div className="history-header">
                    <p className="history-date">{date}</p>
                    <span className="history-score">{score} 分</span>
                  </div>
                  <div className="chips">
                    {ids.filter(id => habitMap[id]).map(id => {
                      const g = GROUP_MAP[habitMap[id].group || 'study']
                      return (
                        <span key={id} className="chip" style={{ background: g.bg, color: g.color }}>
                          ✓ {habitMap[id].name} +{habitMap[id].score || 1}
                        </span>
                      )
                    })}
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
