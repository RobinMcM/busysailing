import ExamplePrompts from '../ExamplePrompts';

export default function ExamplePromptsExample() {
  return (
    <div className="p-6">
      <ExamplePrompts onPromptClick={(prompt) => console.log('Prompt clicked:', prompt)} />
    </div>
  );
}
