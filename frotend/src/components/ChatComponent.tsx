import { useState, useEffect, useRef } from 'react'
import { useDataChannel, useLocalParticipant, useRemoteParticipants } from '@livekit/components-react'

interface ChatMessage {
  id: string
  participantName: string
  message: string
  timestamp: Date
  isLocal: boolean
}

const ChatComponent = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { localParticipant } = useLocalParticipant()
  const remoteParticipants = useRemoteParticipants()
  
  // Use LiveKit data channel for chat
  const { send: sendData } = useDataChannel('chat', (message) => {
    try {
      const chatData = JSON.parse(new TextDecoder().decode(message.payload))
      
      // Find the participant who sent the message
      let senderName = 'Unknown'
      if (message.from) {
        const participant = remoteParticipants.find(p => p.identity === message.from?.identity)
        senderName = participant?.name || participant?.identity || message.from.identity || 'Unknown'
      }
      
      const newChatMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random()}`,
        participantName: senderName,
        message: chatData.message,
        timestamp: new Date(chatData.timestamp),
        isLocal: false
      }
      
      setMessages(prev => [...prev, newChatMessage])
    } catch (error) {
      console.error('Error parsing chat message:', error)
    }
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Update connection status
  useEffect(() => {
    setIsConnected(!!localParticipant && localParticipant.connectionQuality !== undefined)
  }, [localParticipant])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !localParticipant || !sendData) {
      return
    }

    const messageText = newMessage.trim()
    
    // Prevent sending empty messages or messages that are too long
    if (messageText.length === 0 || messageText.length > 500) {
      return
    }

    try {
      // Create message data
      const messageData = {
        message: messageText,
        timestamp: Date.now()
      }

      // Send via data channel
      const encoder = new TextEncoder()
      const data = encoder.encode(JSON.stringify(messageData))
      sendData(data, { reliable: true })

      // Add to local messages immediately
      const localChatMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random()}`,
        participantName: localParticipant.name || localParticipant.identity || 'You',
        message: messageText,
        timestamp: new Date(),
        isLocal: true
      }

      setMessages(prev => [...prev, localChatMessage])
      setNewMessage('')
      
    } catch (error) {
      console.error('Error sending chat message:', error)
      // Could add user-visible error handling here in the future
    }
  }

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-750">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Live Chat</h3>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
            isConnected ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`max-w-[85%] ${message.isLocal ? 'ml-auto' : 'mr-auto'}`}
            >
              <div className={`p-3 rounded-2xl ${
                message.isLocal 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : 'bg-gray-700 text-white rounded-bl-sm'
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium opacity-90">
                    {message.participantName}
                  </span>
                  <span className="text-xs opacity-70">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                <div className="text-sm leading-relaxed break-words">
                  {message.message}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700 bg-gray-750">
        <form onSubmit={handleSendMessage}>
          <div className="flex space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
              placeholder={isConnected ? "Type a message..." : "Connecting..."}
              disabled={!isConnected}
              maxLength={500}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-full px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim() || !isConnected}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-full font-medium transition-colors text-sm"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChatComponent