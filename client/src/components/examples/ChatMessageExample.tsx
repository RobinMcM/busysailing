import ChatMessage from '../ChatMessage';

export default function ChatMessageExample() {
  return (
    <div className="space-y-6 p-6">
      <ChatMessage
        role="user"
        content="What tax deductions can I claim as a small business owner?"
        timestamp="2:34 PM"
      />
      <ChatMessage
        role="assistant"
        content="As a small business owner, you can claim several tax deductions including: office expenses, business travel, professional services, marketing costs, and equipment purchases. These deductions can significantly reduce your taxable income. Would you like me to explain any of these categories in more detail?"
        timestamp="2:34 PM"
      />
    </div>
  );
}
