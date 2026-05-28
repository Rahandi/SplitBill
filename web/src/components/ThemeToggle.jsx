import { useTheme } from '../hooks/useTheme'

const commit = import.meta.env.VITE_GIT_COMMIT?.slice(0, 7)

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      {commit && (
        <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 select-none">
          {commit}
        </span>
      )}
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow transition text-gray-500 dark:text-gray-400"
      >
        {theme === 'dark' ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>
    </div>
  )
}
