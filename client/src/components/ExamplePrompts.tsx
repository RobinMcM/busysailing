import { Card } from '@/components/ui/card';
import { Calculator, FileText, DollarSign, TrendingUp, Building, Receipt } from 'lucide-react';

interface ExamplePromptsProps {
  onPromptClick: (prompt: string) => void;
  disabled?: boolean;
}

const prompts = [
  {
    icon: Calculator,
    text: "How do I calculate my Self Assessment tax bill?",
  },
  {
    icon: FileText,
    text: "What is the Personal Allowance for the current tax year?",
  },
  {
    icon: DollarSign,
    text: "What's the difference between an ISA and a SIPP?",
  },
  {
    icon: TrendingUp,
    text: "How does National Insurance work?",
  },
  {
    icon: Building,
    text: "Should I register as a sole trader or limited company?",
  },
  {
    icon: Receipt,
    text: "What business expenses can I claim for tax relief?",
  },
];

export default function ExamplePrompts({ onPromptClick, disabled = false }: ExamplePromptsProps) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold mb-4 text-foreground">Example Questions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {prompts.map((prompt, index) => {
          const Icon = prompt.icon;
          return (
            <Card
              key={index}
              className={`p-4 transition-all ${
                disabled
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover-elevate active-elevate-2 cursor-pointer'
              }`}
              onClick={() => !disabled && onPromptClick(prompt.text)}
              data-testid={`prompt-${index}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  disabled ? 'text-muted-foreground' : 'text-primary'
                }`} />
                <span className={`text-sm ${
                  disabled ? 'text-muted-foreground' : 'text-card-foreground'
                }`}>{prompt.text}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
