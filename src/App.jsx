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
  const [tab, setTab] = useState('today') // 'today' | 'history'

  useEffect(() => {
    const { habits, records } = loadData()
    setHabits(habits)
    setRecords(records)
  }, [])

  const todayCheckins = records[TODAY] || []

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
    if (!name) return
    const updated = [...habits, { id: Date.now().toString(), name }]
    setHabits(updated)
    saveHabits(updated)
    setNewName('')
  }

  function deleteHabit(id) {
    if (!confirm('删除这个打卡项目？')) return
    const updated = habits.filter(h => h.id !== id)
    setHabits(updated)
    saveHabits(updated)
  }

  // 历史记录，按日期降序
  const historyDays = Object.keys(records)
    .sort((a, b) => b.localeCompare(a))
    .map(date => ({ date, ids: records[date] }))
    .filter(d => d.ids.length > 0)

  const habitMap = Object.fromEntries(habits.map(h => [h.id, h.name]))

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
                  <button className="delete-btn" onClick={() => deleteHabit(h.id)}>✕</button>
                </li>
              )
            })}
          </ul>
          <div className="add-row">
            <input
              placeholder="添加新习惯..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHabit()}
            />
            <button onClick={addHabit}>添加</button>
          </div>
        </main>
      )}

      {tab === 'history' && (
        <main>
          {historyDays.length === 0 && <p className="empty">还没有打卡记录</p>}
          {historyDays.map(({ date, ids }) => (
            <div key={date} className="history-card">
              <p className="history-date">{date}</p>
              <div className="chips">
                {ids.map(id => (
                  <span key={id} className="chip">✓ {habitMap[id] || '已删除'}</span>
                ))}
              </div>
            </div>
          ))}
        </main>
      )}
    </div>
  )
}
