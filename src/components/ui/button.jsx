export function Button({ children, ...props }) {
  return (
    <button className="bg-blue-500 hover:bg-blue-600 text-white rounded px-4 py-2" {...props}>
      {children}
    </button>
  );
}
