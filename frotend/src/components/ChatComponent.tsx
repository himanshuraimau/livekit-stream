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
    <div className="chat-component">
      <div className="chat-header">
        <h3>Chat</h3>
        <div className="chat-status">
          {isConnected ? (
            <span className="status-connected">🟢 Connected</span>
          ) : (
            <span className="status-disconnected">🔴 Disconnected</span>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`chat-message ${message.isLocal ? 'local' : 'remote'}`}
            >
              <div className="message-header">
                <span className="participant-name">
                  {message.participantName}
                </span>
                <span className="message-time">
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <div className="message-content">
                {message.message}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <div className="chat-input-container">
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
            className="chat-input"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim() || !isConnected}
            className="send-button"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatComponent