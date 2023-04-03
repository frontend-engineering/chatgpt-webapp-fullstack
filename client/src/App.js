import './App.css';
import Chat from './Chat';
import AddPrompt from './CreatePrompt'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/build" element={<Chat />} />
          <Route path="/build/editPrompt/">
            <Route index element={<AddPrompt />} />
            <Route path=":value" element={<AddPrompt />} />
          </Route>
        </Routes>
      </Router>
    </div>
  );
}

export default App;
