const VARIANTS = {
  primary: 'bg-black text-white hover:bg-gray-800',
  secondary: 'bg-white text-black border border-gray-300 hover:border-gray-400',
  ghost: 'bg-transparent text-gray-500 hover:text-black',
}

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`px-3 py-1.5 text-[13px] font-medium rounded-sm transition-colors ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
