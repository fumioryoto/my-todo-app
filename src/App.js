import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';


const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const views = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

export default function TodoDashboard() {
  const [task, setTask] = useState('');
  const [date, setDate] = useState('');
  const [repeatDays, setRepeatDays] = useState([]);
  const [todos, setTodos] = useState([]);
  const [removedTodos, setRemovedTodos] = useState([]);
  const [scope, setScope] = useState('Daily');
  const [view, setView] = useState('pending');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDriveSection, setShowDriveSection] = useState(false);
  const [driveLink, setDriveLink] = useState('');
  const [classKey, setClassKey] = useState('');



  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayDay = weekDays[today.getDay()];
  const incidentText = `${format(today, 'dd-MM-yyyy')} ~ No major incident found!`;

  useEffect(() => {
  const stored = localStorage.getItem('myTodos');
  const removed = localStorage.getItem('removedTodos');

  if (stored) {
    setTodos(JSON.parse(stored));
  } else {
    // fallback load from public/my-todos.json
    fetch('/my-todos.json')
      .then(res => res.json())
      .then(data => {
        setTodos(data.todos || []);
        setRemovedTodos(data.removedTodos || []);
      })
      .catch(() => {
        console.log("⚠️ Fallback JSON load failed.");
      });
  }

  if (removed) {
    setRemovedTodos(JSON.parse(removed));
  }
}, []);


  useEffect(() => {
  const midnightReset = setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      const todayDay = weekDays[now.getDay()];
      setTodos(prevTodos =>
        prevTodos.map(todo =>
          todo.repeatDays.includes(todayDay)
            ? { ...todo, done: '' }
            : todo
        )
      );
    }
  }, 60000);

  return () => clearInterval(midnightReset);
}, []);



  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [todos, removedTodos]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);


  const toggleRepeatDay = (day) => {
    setRepeatDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const addTodo = () => {
    if (!task.trim()) return;
    const newTodo = {
      id: Date.now(),
      task,
      date: date || '',
      repeatDays,
      done: false
    };
    setTodos([...todos, newTodo]);
    setTask('');
    setDate('');
    setRepeatDays([]);
  };

  const toggleDone = (id) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  setTodos(todos.map(todo =>
    todo.id === id
      ? { ...todo, done: todo.done === todayStr ? '' : todayStr }
      : todo
  ));
};



  const removeTodo = (id) => {
    const removed = todos.find(t => t.id === id);
    setTodos(todos.filter(t => t.id !== id));
    setRemovedTodos([...removedTodos, removed]);
  };

  const undoRemove = (id) => {
    const restored = removedTodos.find(t => t.id === id);
    setRemovedTodos(removedTodos.filter(t => t.id !== id));
    setTodos([...todos, restored]);
  };

  const deletePermanently = (id) => {
    setRemovedTodos(removedTodos.filter(t => t.id !== id));
  };

  const clearSchedule = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, date: '', repeatDays: [] } : todo
    ));
  };

  const copyIncident = () => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(incidentText)
      .then(() => alert('Copied!'))
      .catch(err => alert('Failed to copy: ' + err));
  } else {
    // fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = incidentText;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      alert('Copied!');
    } catch (err) {
      alert('Failed to copy');
    }
    document.body.removeChild(textarea);
  }
};



  const downloadJSON = () => {
    const data = { todos, removedTodos };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'my-todos.json';
    link.click();
  };

  const saveTasks = () => {
    localStorage.setItem('myTodos', JSON.stringify(todos));
    localStorage.setItem('removedTodos', JSON.stringify(removedTodos));
    downloadJSON();
    setHasUnsavedChanges(false);
  };

  const uploadJSON = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      // Purge Old LocalStorage
      localStorage.removeItem('myTodos');
      localStorage.removeItem('removedTodos');

      const data = JSON.parse(reader.result);
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const todayDay = weekDays[new Date().getDay()];

      const resetTodos = (data.todos || []).map(todo => {
        let doneValue = '';
        if (typeof todo.done === 'boolean') {
          doneValue = todo.done ? todayStr : '';
        } else if (todo.done === todayStr) {
          doneValue = todayStr;
        }

        const isRepeatToday = todo.repeatDays.includes(todayDay);
        const isDateToday = todo.date === todayStr;

        if ((isRepeatToday || isDateToday) && doneValue !== todayStr) {
          doneValue = '';
        }

        return { ...todo, done: doneValue };
      });

      setTodos(resetTodos);
      setRemovedTodos(data.removedTodos || []);
      setHasUnsavedChanges(false);
    } catch (err) {
      alert('Invalid JSON file');
    }
  };
  reader.readAsText(file);
};


  const filterByScope = (todo) => {
  const dateObj = new Date(todo.date || todayStr);
  const now = new Date();
  if (!todo.date && !todo.repeatDays.length) return false;

  switch (scope) {
    case 'Daily':
      return (todo.date === todayStr || todo.repeatDays.includes(todayDay));
    case 'Weekly': {
      const diff = (now - dateObj) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }
    case 'Monthly': {
      return (
        dateObj.getFullYear() === now.getFullYear() &&
        dateObj.getMonth() === now.getMonth() &&
        dateObj <= now
      );
    }
    case 'Yearly': {
      return (
        dateObj.getFullYear() === now.getFullYear() &&
        dateObj <= now
      );
    }
    default:
      return false;
  }
};


    const filteredTodos = todos.filter(filterByScope);

  const visibleTodos =
    view === 'removed'
      ? removedTodos
      : view === 'scheduled'
        ? todos.filter(t =>
            (t.repeatDays.length > 0 && t.done !== todayStr && !t.date) ||
            (t.date && new Date(t.date) > today && (!t.done || t.done !== format(new Date(t.date), 'yyyy-MM-dd')))
          )
        : todos.filter(todo => {
            const isRepeatToday = todo.repeatDays.includes(todayDay);
            const isDateToday = todo.date === todayStr;
            const isDoneToday = typeof todo.done === 'string' && todo.done === todayStr;

            if (view === 'pending') {
              return (isRepeatToday || isDateToday) && !isDoneToday;
            }

            if (view === 'done') {
              return isDoneToday;
            }

            return true;
          });


  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-center"> Falcon To-Do Dashboard</h1>

      <div className="flex gap-2 mb-4 items-center flex-wrap">
        <input
          className="border p-2 flex-grow rounded"
          placeholder="Enter task"
          value={task}
          onChange={(e) => setTask(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={addTodo}>
          Add
        </button>

        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="border p-2 rounded"
        >
          {views.map(v => <option key={v}>{v}</option>)}
        </select>

        <button
          onClick={saveTasks}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          📥 Save Tasks
        </button>

        <label className="bg-yellow-500 text-white px-4 py-2 rounded cursor-pointer">
          📤 Upload JSON
          <input type="file" accept="application/json" onChange={uploadJSON} hidden />
        </label>
      </div>

      <div className="mb-4 flex justify-between items-center">
        <div>
          <p className="mb-2 font-medium">Repeat on:</p>
          <div className="flex gap-2 flex-wrap">
            {weekDays.map(day => (
              <label key={day} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={repeatDays.includes(day)}
                  onChange={() => toggleRepeatDay(day)}
                />
                {day}
              </label>
            ))}
          </div>
        </div>

        <div className="text-sm text-red-600 flex items-center gap-2">
  

  <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer">
  <img
    src="https://www.svgrepo.com/show/424916/meta-logo-facebook.svg"
    alt="Facebook"
    style={{ width: '20px', height: '20px' }}
  />
</a>

  <a href="https://translate.google.com.bd/?hl=en&tab=rT&sl=bn&tl=en&op=translate" target="_blank" rel="noopener noreferrer">
  <img
    src="https://www.kindpng.com/picc/m/292-2920081_bengali-alphabet-png-transparent-png.png"
    alt="translate"
    style={{ width: '20px', height: '20px' }}
  />
</a>
  <a
    href="https://web.whatsapp.com/"
    target="_blank"
    rel="noopener noreferrer"
    title="Open WhatsApp Web"
  >
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
      alt="WhatsApp"
      style={{ width: '20px', height: '20px' }}
    />
  </a>
  <span>{incidentText}</span>
  <button onClick={copyIncident} className="border px-2 py-1 rounded bg-gray-100">⎙</button>
</div>

      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-red-100 p-4 rounded text-center">
          <p className="text-lg">⚠️ Pending Tasks</p>
          <p className="text-2xl font-bold">{filteredTodos.filter(t => !t.done).length}</p>
        </div>
        <div className="bg-green-100 p-4 rounded text-center">
          <p className="text-lg">✅ Completed Tasks</p>
          <p className="text-2xl font-bold">{filteredTodos.filter(t => t.done).length}</p>
        </div>
      </div>

      <div className="flex gap-4 justify-center mb-4 flex-wrap">
        <button onClick={() => setView('pending')} className={`px-4 py-2 rounded ${view==='pending'?'bg-blue-500 text-white':'bg-gray-200'}`}>Pending</button>
        <button onClick={() => setView('done')} className={`px-4 py-2 rounded ${view==='done'?'bg-blue-500 text-white':'bg-gray-200'}`}>Done</button>
        <button onClick={() => setView('scheduled')} className={`px-4 py-2 rounded ${view==='scheduled'?'bg-blue-500 text-white':'bg-gray-200'}`}>Scheduled</button>
        <button onClick={() => setView('removed')} className={`px-4 py-2 rounded ${view==='removed'?'bg-blue-500 text-white':'bg-gray-200'}`}>Removed</button>
        <button
  onClick={() => setShowDriveSection(!showDriveSection)}
  className="px-4 py-2 rounded bg-purple-500 text-white"
>
  📂 Drive Link
</button>


      </div>
{showDriveSection && (
  <div className="border p-4 rounded bg-gray-50 mb-4">
    <h2 className="text-lg font-bold mb-2">🇬 Google Drive Link</h2>
    <input
      type="text"
      placeholder="Paste your Google Drive link here"
      value={driveLink}
      onChange={(e) => setDriveLink(e.target.value)}
      className="border p-2 rounded w-full mb-2"
    />
    <button
      onClick={() => {
        const match = driveLink.match(/[-\w]{25,}/);
        if (match) {
          setClassKey(match[0]);
        } else {
          alert("⚔︎ Invalid Google Drive link!");
        }
      }}
      className="bg-white-600 text-red px-4 py-2 rounded"
    >
      🗘
    </button>

    {classKey && (
      <div className="mt-3 p-2 bg-white border rounded">
        <p className="text-green-700 font-medium"> Class Key: {classKey}</p>
       <button
  onClick={() => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(classKey)
        .then(() => {
          alert("কপি হয়েছে!");
        })
        .catch(() => {
          alert("কপি ব্যর্থ হয়েছে!");
        });
    } else {
      // Fallback পদ্ধতি
      const textArea = document.createElement("textarea");
      textArea.value = classKey;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        alert("কপি হয়েছে!");
      } catch (err) {
        alert("কপি ব্যর্থ হয়েছে!");
      }
      document.body.removeChild(textArea);
    }
  }}
  className="mt-2 bg-white-500 text-red px-3 py-1 rounded"
>
  ⎙ 
</button>

      </div>
    )}
  </div>
)}

      <div className="space-y-2">
        {visibleTodos.length === 0 ? (
          <p className="text-center text-gray-500">No {view} tasks for {scope}.</p>
        ) : (
          visibleTodos.map(todo => (
            <div key={todo.id} className="bg-white border p-4 rounded relative shadow">
              {(view === 'scheduled' || view === 'pending' || view === 'done') && (
                <button onClick={() => (view==='scheduled'?clearSchedule(todo.id):removeTodo(todo.id))} className="absolute top-1 left-1 w-5 h-5 flex items-center justify-center rounded-full bg-gray-300 text-xs text-white" style={{ backgroundColor: '#c99ab7ff' }}
                >
                  メ
                </button>
              )}

              <span className={todo.done ? 'line-through text-gray-500 ml-7' : 'ml-7'}>{todo.task}</span>

              {view === 'scheduled' && (
                <div className="text-sm text-gray-600 mt-1 ml-7">
                  {todo.date && <p>📅 Date: {todo.date}</p>}
                  {todo.repeatDays.length > 0 && <p> ♻ Repeats: {todo.repeatDays.join(', ')}</p>}
                </div>
              )}

              {view !== 'scheduled' && view !== 'removed' && (
                <button onClick={() => toggleDone(todo.id)} className="text-sm px-3 py-1 border rounded float-right">{todo.done ? 'Undo' : 'Mark Done'}</button>
              )}

              {view === 'removed' && (
                <div className="absolute top-1 right-1 flex gap-1">
                  <button onClick={() => undoRemove(todo.id)} className="text-xs bg-green-200 px-1 rounded">Undo</button>
                  <button onClick={() => deletePermanently(todo.id)} className="text-xs bg-red-300 px-1 rounded">Delete</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}