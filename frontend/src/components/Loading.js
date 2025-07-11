// frontend/src/components/Loading.js
export default function Loading() {
  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="relative">
        {/* Animated logo */}
        <div className="w-32 h-32 relative">
          {/* Outer ring */}
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full animate-spin" />
          
          {/* Middle ring */}
          <div className="absolute inset-2 border-4 border-gray-700 rounded-full animate-spin animation-reverse" />
          
          {/* Inner circle with pulse */}
          <div className="absolute inset-4 bg-blue-600 rounded-full animate-pulse flex items-center justify-center">
            <span className="text-white font-bold text-xl">AP</span>
          </div>
        </div>
        
        {/* Loading text */}
        <div className="mt-8 text-center">
          <p className="text-white text-lg font-semibold">Loading...</p>
          <div className="mt-2 flex justify-center gap-1">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  );
}