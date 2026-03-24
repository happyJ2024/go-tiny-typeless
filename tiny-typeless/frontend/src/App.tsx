import { useState, useEffect } from 'react';
import './App.css';
import MainPage from './pages/MainPage';
import SettingsPage from './pages/SettingsPage';
import { useAppLogs } from './hooks/useAppLogs';

function App() {
    const [currentPage, setCurrentPage] = useState<'main' | 'settings'>('main');
    const { logs, clearLogs } = useAppLogs();

    return (
        <div id="App" className="app-container">
            <nav className="navbar">
                <div className="nav-title">Tiny Typeless</div>
                <button 
                    className={`nav-button ${currentPage === 'main' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('main')}
                >
                    Record
                </button>
                <button 
                    className={`nav-button ${currentPage === 'settings' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('settings')}
                >
                    Settings
                </button>
            </nav>

            <div className="page-container">
                {currentPage === 'main' && <MainPage logs={logs} onClearLogs={clearLogs} />}
                {currentPage === 'settings' && <SettingsPage />}
            </div>
        </div>
    );
}

export default App;

