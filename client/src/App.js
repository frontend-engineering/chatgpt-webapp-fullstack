import './App.css';
import Chat from './Chat';
import AddPrompt from './CreatePrompt'
import Account from './Account'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/build">
            <Route index element={<Chat />} />
            <Route path='account' element={<Account />}></Route>
            <Route path='editPrompt' element={<AddPrompt />}>
              <Route path=':value' element={<AddPrompt />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </div>
  );
}

export default App;
