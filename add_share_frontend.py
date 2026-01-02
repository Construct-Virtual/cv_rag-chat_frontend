import re

# Read the file
with open('frontend/app/chat/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state for share modal after searchQuery
state_pattern = r'(const \[searchQuery, setSearchQuery\] = useState\(""\);)'
state_addition = r'''\1
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isSharing, setIsSharing] = useState(false);'''

content = re.sub(state_pattern, state_addition, content)

# 2. Add share function before the return statement
return_pattern = r'(  // Filter conversations based on search query)'
share_function = r'''  const handleShare = async () => {
    if (!currentConversation) return;

    setIsSharing(true);
    try {
      const response = await apiPost(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations/${currentConversation.id}/share`,
        {}
      );

      if (!response.ok) {
        throw new Error("Failed to share conversation");
      }

      const data = await response.json();
      const shareToken = data.share_token;
      const url = `${window.location.origin}/shared/${shareToken}`;
      setShareUrl(url);
      setIsShareModalOpen(true);

      // Update current conversation to reflect shared status
      setCurrentConversation({ ...currentConversation, is_shared: true, share_token: shareToken });

      // Reload conversations to update sidebar
      await loadConversations();

      setToast({ message: "Conversation shared successfully!", type: "success" });
    } catch (err) {
      console.error("Failed to share conversation:", err);
      setToast({ message: "Failed to share conversation", type: "error" });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast({ message: "Link copied to clipboard!", type: "success" });
    } catch (err) {
      console.error("Failed to copy link:", err);
      setToast({ message: "Failed to copy link", type: "error" });
    }
  };

  const handleCloseShareModal = () => {
    setIsShareModalOpen(false);
    setShareUrl("");
  };

  \1'''

content = re.sub(return_pattern, share_function, content)

# Write the file back
with open('frontend/app/chat/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added share frontend state and functions")
