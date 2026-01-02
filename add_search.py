import re

# Read the file
with open('frontend/app/chat/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Add search query state after the toast state
state_pattern = r'(const \[toast, setToast\] = useState<\{ message: string; type: "success" \| "error" \} \| null>\(null\);)'
state_replacement = r'\1\n  const [searchQuery, setSearchQuery] = useState("");'

content = re.sub(state_pattern, state_replacement, content)

# Step 2: Add filtered conversations logic before the return statement
return_pattern = r'(  return \()'
filtered_logic = r'''  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

\1'''

content = re.sub(return_pattern, filtered_logic, content)

# Step 3: Replace conversations.map with filteredConversations.map
# Also update conversations.length check
content = content.replace('conversations.length === 0', 'filteredConversations.length === 0')
content = content.replace('conversations.map((conv)', 'filteredConversations.map((conv)')

# Step 4: Update the empty state message to account for search
empty_state_pattern = r'(<div className="text-center text-\[#737373\] text-sm mt-4">\s*No conversations yet\.\s*<br />\s*Click "\+ New Chat" to start\.\s*</div>)'
empty_state_replacement = r'''<div className="text-center text-[#737373] text-sm mt-4">
                  {searchQuery ? (
                    <>
                      No conversations match your search.
                      <br />
                      Try a different search term.
                    </>
                  ) : (
                    <>
                      No conversations yet.
                      <br />
                      Click "+ New Chat" to start.
                    </>
                  )}
                </div>'''

content = re.sub(empty_state_pattern, empty_state_replacement, content, flags=re.DOTALL)

# Step 5: Add search input in sidebar - find the "New Chat Button" comment
search_input_html = '''            {/* Search Input */}
            <div className="mb-4">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#737373]"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="8" cy="8" r="6" />
                  <path d="M14 14l4 4" />
                </svg>
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg pl-10 pr-10 py-2 text-sm text-[#F5F5F5] placeholder-[#737373] focus:outline-none focus:border-[#3B82F6] transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#737373] hover:text-[#F5F5F5] transition-colors"
                    title="Clear search"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3l8 8M11 3l-8 8" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

'''

search_input_pattern = r'(            \{/\* New Chat Button \*/\})'
content = re.sub(search_input_pattern, search_input_html + r'\1', content)

# Write the file back
with open('frontend/app/chat/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Search feature added successfully!")
