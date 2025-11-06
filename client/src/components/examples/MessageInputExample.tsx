import MessageInput from '../MessageInput';

export default function MessageInputExample() {
  return (
    <div className="p-6">
      <MessageInput onSend={(msg) => console.log('Message sent:', msg)} />
    </div>
  );
}
