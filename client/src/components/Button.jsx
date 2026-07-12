export default function Button({ children, onClick, type = 'button', variant = 'primary', disabled = false, className = '' }) {
  const base = 'px-4 py-2 rounded-md text-sm font-medium transition-colors';
  const variants = {
    primary: 'bg-black text-white hover:bg-gray-800 disabled:bg-gray-300',
    secondary: 'bg-white text-black border border-gray-300 hover:bg-gray-50',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}