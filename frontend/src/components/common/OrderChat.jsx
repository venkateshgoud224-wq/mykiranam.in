import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

const OrderChat = ({ orderId, onClose, otherPartyName }) => {
  const { token, user, apiUrl } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChats();
    // In a real app, you'd integrate Socket.io here for real-time updates
    const interval = setInterval(fetchChats, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchChats = async () => {
    try {
      const response = await fetch(`${apiUrl}/orders/${orderId}/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await response.text();
      let data = [];
      try { data = JSON.parse(text); } catch(e) { throw new Error('Server returned HTML'); }
      if (response.ok) setMessages(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    // Optimistically clear the input so mobile users see immediate feedback
    const messageToSend = newMessage;
    const fileToSend = selectedFile;
    setNewMessage('');
    setSelectedFile(null);

    try {
      setIsUploading(true);
      const formData = new FormData();
      if (messageToSend.trim()) formData.append('message', messageToSend);
      if (fileToSend) formData.append('attachment', fileToSend);

      const response = await fetch(`${apiUrl}/orders/${orderId}/chats`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error('Server returned HTML'); }
      if (!response.ok) throw new Error(data.error || 'Failed to send message');
      setMessages((prev) => [...prev, data]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore input if it failed
      setNewMessage(messageToSend);
      setSelectedFile(fileToSend);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col h-[600px] max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-kirana-500/10 text-kirana-600 rounded-full flex items-center justify-center font-bold">
              {otherPartyName?.charAt(0) || '?'}
            </div>
            <div>
              <h3 className="font-bold text-gray-800 leading-tight">{otherPartyName || 'Chat'}</h3>
              <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Online
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex justify-center items-center bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-kirana-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-gray-400">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
              <p>Start the conversation</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMine = Number(msg.sender_id) === Number(user.id);
              let textContent = msg.message || '';
              let attachmentUrl = null;
              
              // Extract attachment URL if present
              const attachmentMatch = textContent.match(/\[Attachment: (.*?)\]/);
              if (attachmentMatch) {
                attachmentUrl = attachmentMatch[1];
                textContent = textContent.replace(attachmentMatch[0], '').trim();
              }

              const getFullImageUrl = (path) => {
                if (!path) return '';
                if (path.startsWith('http://') || path.startsWith('https://')) return path;
                return `${apiUrl.replace('/api', '')}${path}`;
              };

              return (
                <div key={index} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-3 ${isMine ? 'bg-kirana-500 text-white rounded-br-none shadow-md shadow-kirana-500/20' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none shadow-sm'}`}>
                    {attachmentUrl && (
                      <div className="mb-2">
                        {attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? (
                          <img src={getFullImageUrl(attachmentUrl)} alt="attachment" className="max-w-full rounded-lg max-h-48 object-cover" />
                        ) : (
                          <a href={getFullImageUrl(attachmentUrl)} target="_blank" rel="noreferrer" className={`flex items-center gap-1 text-xs font-semibold underline ${isMine ? 'text-white' : 'text-kirana-600'}`}>
                            📄 View Attachment
                          </a>
                        )}
                      </div>
                    )}
                    {textContent && <p className="text-sm whitespace-pre-wrap">{textContent}</p>}
                    <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-kirana-100' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="bg-white border-t border-gray-100 rounded-b-2xl p-2 sm:p-3">
          {selectedFile && (
            <div className="px-3 py-2 bg-gray-50 flex items-center justify-between border border-gray-200 rounded-lg mb-2">
              <span className="text-xs text-gray-600 truncate flex-1">📎 {selectedFile.name}</span>
              <button 
                type="button" 
                onClick={() => setSelectedFile(null)}
                className="ml-2 text-gray-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1.5 shadow-inner">
            <label htmlFor="file-upload" className="cursor-pointer text-gray-500 hover:text-kirana-600 transition-colors p-1.5 rounded-full hover:bg-gray-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
            </label>
            <input type="file" id="file-upload" className="hidden" onChange={handleFileSelect} />
            
            <label htmlFor="image-upload" className="cursor-pointer text-gray-500 hover:text-kirana-600 transition-colors p-1.5 rounded-full hover:bg-gray-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </label>
            <input type="file" id="image-upload" accept="image/*" className="hidden" onChange={handleFileSelect} />

            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              placeholder="Message..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1.5 px-2 outline-none min-w-0 text-gray-800 placeholder-gray-400"
            />
            <button 
              type="button"
              onClick={sendMessage}
              onPointerDown={(e) => e.preventDefault()}
              disabled={(!newMessage.trim() && !selectedFile) || isUploading}
              className="bg-kirana-500 hover:bg-kirana-600 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-full p-2 w-8 h-8 sm:w-9 sm:h-9 flex justify-center items-center transition-colors shrink-0"
            >
              {isUploading ? (
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-t-2 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderChat;
