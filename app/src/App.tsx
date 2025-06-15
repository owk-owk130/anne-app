import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';
import reactLogo from './assets/react.svg';
import './App.css';

function App() {
  const [greetMsg, setGreetMsg] = useState('');
  const [name, setName] = useState('');

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke('greet', { name }));
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">
        Welcome to Tauri + React
      </h1>

      <div className="flex items-center justify-center space-x-6 mb-8">
        <a
          href="https://vitejs.dev"
          target="_blank"
          rel="noreferrer"
          className="block hover:scale-110 transition-transform duration-300"
        >
          <img
            src="/vite.svg"
            className="h-24 w-24 hover:drop-shadow-[0_0_2em_#747bffaa] transition-all duration-300"
            alt="Vite logo"
          />
        </a>
        <a
          href="https://tauri.app"
          target="_blank"
          rel="noreferrer"
          className="block hover:scale-110 transition-transform duration-300"
        >
          <img
            src="/tauri.svg"
            className="h-24 w-24 hover:drop-shadow-[0_0_2em_#24c8db] transition-all duration-300"
            alt="Tauri logo"
          />
        </a>
        <a
          href="https://reactjs.org"
          target="_blank"
          rel="noreferrer"
          className="block hover:scale-110 transition-transform duration-300"
        >
          <img
            src={reactLogo}
            className="h-24 w-24 hover:drop-shadow-[0_0_2em_#61dafbaa] transition-all duration-300 animate-spin-slow"
            alt="React logo"
          />
        </a>
      </div>

      <p className="text-lg mb-8 text-gray-600 dark:text-gray-400">
        Click on the Tauri, Vite, and React logos to learn more.
      </p>

      <form
        className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 font-medium"
        >
          Greet
        </button>
      </form>

      {greetMsg && (
        <p className="text-xl font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
          {greetMsg}
        </p>
      )}
    </main>
  );
}

export default App;
