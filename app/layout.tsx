import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'DocuMind AI — Chat with your documents',
  description: 'Upload any document and chat with it instantly. Summarize, quiz, extract, analyze — powered by Google Gemini + HuggingFace. Built by MOH AI TECH, Namakkal.',
  keywords: ['AI', 'document', 'chat', 'PDF', 'summarize', 'quiz', 'RAG', 'MOH AI TECH'],
  authors: [{ name: 'Mohan Kumar S', url: 'https://moh-ai-tech.vercel.app' }],
  openGraph: {
    title: 'DocuMind AI — Chat with your documents',
    description: 'Enterprise document intelligence. Built by MOH AI TECH.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧠</text></svg>" />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#0f1117',
              border: '1px solid #e8eaf2',
              fontSize: '13.5px',
              fontWeight: '500',
              boxShadow: '0 8px 32px rgba(15,17,23,0.12)',
              borderRadius: '10px',
            },
            success: { iconTheme: { primary: '#059669', secondary: 'white' } },
            error: { iconTheme: { primary: '#dc2626', secondary: 'white' } },
          }}
        />
      </body>
    </html>
  )
}
