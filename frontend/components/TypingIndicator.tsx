'use client';

// F70: Improved typing indicator with staggered bouncing dots animation
export function TypingIndicator() {
  return (
    <div className="flex justify-start animate-message-in">
      <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-3 bg-[#1A1A1A] text-[#F5F5F5] border border-[#2A2A2A]">
        <div className="text-xs opacity-70 mb-1 font-medium">AI Assistant</div>
        <div className="flex gap-1.5 py-1 items-center">
          {/* F70: Staggered bouncing dots with improved animation */}
          <div
            className="w-2 h-2 bg-[#737373] rounded-full animate-typing-dot animate-typing-dot-1"
          />
          <div
            className="w-2 h-2 bg-[#737373] rounded-full animate-typing-dot animate-typing-dot-2"
          />
          <div
            className="w-2 h-2 bg-[#737373] rounded-full animate-typing-dot animate-typing-dot-3"
          />
        </div>
      </div>
    </div>
  );
}
