// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Marshmallow Submit Page (Public)

'use client';

import { ArrowLeft, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

// Mock config - would come from API
const getMarshmallowConfig = (talentPath: string) => {
  const configs: Record<string, any> = {
    'sakura-miko': {
      isEnabled: true,
      displayName: 'さくらみこ',
      greetingMessage: 'みこにゃんへのメッセージや質問をお待ちしています！💕',
      placeholderText: 'メッセージを入力してください...',
      submitButtonText: '送信する',
      successMessage: 'メッセージを送信しました！ありがとうございます！',
      minLength: 10,
      maxLength: 500,
      primaryColor: '#FF69B4',
    },
    'test-talent': {
      isEnabled: true,
      displayName: 'Test Talent',
      greetingMessage: 'Send your questions or messages!',
      placeholderText: 'Type your message...',
      submitButtonText: 'Submit',
      successMessage: 'Your message has been sent!',
      minLength: 10,
      maxLength: 1000,
      primaryColor: '#3B82F6',
    },
  };

  return configs[talentPath] || null;
};

export default function MarshmallowPage() {
  const params = useParams();
  const router = useRouter();
  const talentPath = params.talentPath as string;
  
  const config = getMarshmallowConfig(talentPath);
  
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Page Not Found</h1>
          <p className="text-muted-foreground mt-2">This talent page does not exist.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (!config.isEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Marshmallow Closed</h1>
          <p className="text-muted-foreground mt-2">
            {config.displayName}'s marshmallow is currently closed.
          </p>
          <Link href={`/${talentPath}`}>
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Homepage
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.length < config.minLength) {
      setErrorMessage(`Message must be at least ${config.minLength} characters.`);
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate success
      setSubmitStatus('success');
      setMessage('');
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryColor = config.primaryColor || '#3B82F6';

  return (
    <div 
      className="min-h-screen py-8 px-4"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}10 0%, ${primaryColor}05 50%, white 100%)`,
      }}
    >
      <div className="max-w-lg mx-auto">
        {/* Back button */}
        <Link 
          href={`/${talentPath}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to {config.displayName}'s page
        </Link>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            {/* Avatar */}
            <div 
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold mb-4"
              style={{ 
                backgroundColor: `${primaryColor}20`,
                color: primaryColor,
              }}
            >
              {config.displayName[0]}
            </div>
            <CardTitle>{config.displayName}</CardTitle>
            <CardDescription className="text-base">
              {config.greetingMessage}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {submitStatus === 'success' ? (
              <div className="text-center py-8">
                <div 
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: '#22C55E20' }}
                >
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-green-600">
                  {config.successMessage}
                </h3>
                <Button 
                  variant="outline" 
                  className="mt-6"
                  onClick={() => setSubmitStatus('idle')}
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {submitStatus === 'error' && errorMessage && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={config.placeholderText}
                    maxLength={config.maxLength}
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isSubmitting}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {message.length < config.minLength && message.length > 0 && (
                        <span className="text-amber-500">
                          {config.minLength - message.length} more characters needed
                        </span>
                      )}
                    </span>
                    <span>
                      {message.length} / {config.maxLength}
                    </span>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  style={{ 
                    backgroundColor: primaryColor,
                    color: 'white',
                  }}
                  disabled={isSubmitting || message.length < config.minLength}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {config.submitButtonText}
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Messages are anonymous. Please be respectful and follow the community guidelines.
                </p>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Powered by TCRN TMS
        </p>
      </div>
    </div>
  );
}
