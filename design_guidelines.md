# Financial Chatbot Design Guidelines

## Design Approach: Design System - Material Design Inspired

**Justification**: Financial applications require trust, clarity, and professional presentation. This utility-focused chatbot prioritizes information hierarchy, readability, and user confidence over visual flair. Material Design's emphasis on clear typography, structured layouts, and intuitive interactions aligns perfectly with financial service expectations.

## Typography System

**Font Family**: Inter (via Google Fonts CDN)
- Primary interface font with excellent readability at all sizes
- Professional, modern, and trustworthy appearance

**Type Scale**:
- Chat messages: `text-base` (16px) - optimal reading size
- User input: `text-base` - consistency with messages
- Section headers: `text-lg font-semibold` (18px)
- Page title: `text-2xl font-bold` (24px)
- Helper text/timestamps: `text-sm text-gray-600` (14px)
- Example prompts: `text-sm` (14px)

**Font Weights**:
- Regular (400): Body text, messages
- Semibold (600): Section headers, emphasis
- Bold (700): Page titles, important CTAs

## Layout System

**Spacing Primitives**: Use Tailwind units of **4, 6, and 8** as primary rhythm
- `p-4`, `m-4`: Standard component padding
- `gap-4`: Default spacing between elements
- `p-6`: Section padding
- `p-8`: Major section separation
- `space-y-4`: Vertical rhythm for stacked elements

**Container Structure**:
- Max width: `max-w-4xl mx-auto` (centered, readable width for chat)
- Page padding: `px-4 md:px-6` (responsive horizontal spacing)
- Full-height layout: `min-h-screen flex flex-col`

## Component Library

### Main Layout
- **Header**: Fixed top bar with logo/title, `h-16`, `px-6`, contains app branding
- **Chat Container**: Flex-grow middle section, `flex-1 overflow-y-auto`, `p-6`
- **Input Area**: Fixed bottom, `p-4`, elevated appearance with subtle shadow

### Chat Messages
- **Message Bubble**: Rounded corners `rounded-2xl`, padding `px-4 py-3`
- **User Messages**: Aligned right, `ml-auto max-w-[80%]`
- **AI Messages**: Aligned left, `mr-auto max-w-[80%]`
- **Spacing**: `space-y-6` between message groups
- **Timestamps**: `text-xs` below messages with minimal opacity

### Input Components
- **Text Input**: `rounded-full` design, `px-6 py-3`, prominent focus states
- **Send Button**: Icon-only, circular, positioned at input right
- **Character/Word Count**: Small text below input if needed

### Example Prompts
- **Card Grid**: `grid grid-cols-1 md:grid-cols-2 gap-4`
- **Prompt Cards**: `rounded-lg border p-4`, hover state with subtle elevation
- **Content**: Icon + question text, clickable to populate input

### Controls
- **Action Buttons**: `rounded-lg px-4 py-2`, secondary style
- **Clear Chat**: Positioned in header or above chat area
- **Save Conversation**: Optional export functionality

### Welcome State (Empty Chat)
- Centered content `flex flex-col items-center justify-center`
- App description: `max-w-lg text-center`
- Example prompts grid prominently displayed
- Visual hierarchy: Title → Description → Prompts

## Accessibility
- Focus visible states on all interactive elements using `focus:ring-2 focus:ring-offset-2`
- Semantic HTML: `<main>`, `<header>`, `<form>`, proper heading hierarchy
- ARIA labels for icon buttons
- Keyboard navigation support throughout

## Visual Hierarchy
1. **User Input Area**: Most prominent - always visible and accessible
2. **Latest Messages**: Immediate focus in conversation flow
3. **Example Prompts**: Discoverable but not dominant when chat is active
4. **Header/Controls**: Persistent but unobtrusive

## Animations
**Minimal Approach**:
- Message appear: Simple fade-in `animate-fadeIn` (if needed)
- Typing indicator: Three-dot pulse for AI thinking state
- Button interactions: System defaults (no custom hover animations)

## Icons
**Library**: Heroicons (via CDN)
- Send icon: Paper airplane or arrow
- Clear/Delete: Trash icon
- Example prompts: Lightbulb, document, calculator icons
- Menu/Settings: Hamburger or gear icons

## Additional Notes
- No images required for this application type
- Trust indicators: Consider "Powered by AI" disclaimer with responsible usage notice
- Error states: Clear messaging for failed requests or connection issues
- Loading states: Typing indicator with three animated dots
- Message density: Adequate line-height (`leading-relaxed`) for financial content readability