import { useState, useEffect } from 'react'
import './App.css'

const TODAY = new Date().toISOString().split('T')[0]

function loadData() {
  return {
    habits: JSON.parse(localStorage.getItem('habits') || '[]'),
    records: JSON.parse(localStorage.getItem('records') || '{}'),
  }
}

function saveHabits(habits) {
  localStorage.setItem('habits', JSON.stringify(habits))
}

function saveRecords(records) {
  localStorage.setItem('records', JSON.stringify(records))
}

export default function App() {
  const [habits, setHabits] = useState([])
  const [records, setRecords] = useState({})
  const [newName, setNewName] = useState('')
  const [newScore, setNewScore] = useState('')
  const [tab, setTab] = useState('today')

  useEffect(() => {
    const { habits, records } = loadData()
    setHabits(habits)
    setRecords(records)
  }, [])

  const todayCheckins = records[TODAY] || []

  const todayScore = habits
    .filter(h => todayCheckins.includes(h.id))
    .reduce((sum, h) => sum + (h.score || 0), 0)

  function toggle(id) {
    const current = records[TODAY] || []
    const updated = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id]
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

  const habitMap = Object.fromEntries(habits.map(h => [h.id, h]))

  const historyDays = Object.keys(records)
    .sort((a, b) => b.localeCompare(a))
    .map(date => {
      const ids = records[date]
      const score = ids.reduce((sum, id) => sum + (habitMap[id]?.score || 0), 0)
      return { date, ids, score }
    })
    .filter(d => d.ids.length > 0)

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
              return (
                <li key={h.id} className={done ? 'done' : ''}>
                  <button className="check-btn" onClick={() => toggle(h.id)}>
                    {done ? '✓' : ''}
                  </button>
                  <span className="habit-name">{h.name}</span>
                  <span className="habit-score">+{h.score || 1}</span>
                  <button className="delete-btn" onClick={() => deleteHabit(h.id)}>✕</button>
                </li>
              )
            })}
          </ul>
          <div className="add-row">
            <input
              placeholder="习惯名称..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHabit()}
            />
            <input
              className="score-input"
              placeholder="分数"
              type="number"
              min="1"
              value={newScore}
              onChange={e => setNewScore(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHabit()}
            />
            <button onClick={addHabit}>添加</button>
          </div>
        </main>
      )}

      {tab === 'history' && (
        <main>
          {historyDays.length === 0 && <p className="empty">还没有打卡记录</p>}
          {historyDays.map(({ date, ids, score }) => (
            <div key={date} className="history-card">
              <div className="history-header">
                <p className="history-date">{date}</p>
                <span className="history-score">{score} 分</span>
              </div>
              <div className="chips">
                {ids.map(id => (
                  <span key={id} className="chip">
                    ✓ {habitMap[id]?.name || '已删除'} +{habitMap[id]?.score || 0}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </main>
      )}
    </div>
  )
}
