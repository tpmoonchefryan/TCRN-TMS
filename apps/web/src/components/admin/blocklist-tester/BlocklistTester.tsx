// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
'use client';

import { AlertTriangle, CheckCircle2, Play, Shield, XCircle } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface BlocklistMatch {
  entryId: string;
  pattern: string;
  matchedText: string;
  position: { start: number; end: number };
  severity: 'low' | 'medium' | 'high';
  action: 'reject' | 'flag' | 'replace';
  ownerType: string;
  ownerName: string | null;
}

interface TestResult {
  originalText: string;
  isBlocked: boolean;
  matches: BlocklistMatch[];
  filteredText: string;
}

interface BlocklistTesterProps {
  scopeType?: 'tenant' | 'subsidiary' | 'talent';
  scopeId?: string;
  locale?: 'en' | 'zh' | 'ja';
}

const translations = {
  en: {
    title: 'Blocklist Tester',
    description: 'Test text against active blocklist entries',
    testContent: 'Test Content',
    testContentPlaceholder: 'Enter text to test against blocklist rules...',
    scope: 'Scope',
    runTest: 'Run Test',
    testing: 'Testing...',
    result: 'Result',
    passed: 'Passed',
    blocked: 'Blocked',
    flagged: 'Flagged',
    matches: 'Matches',
    noMatches: 'No blocklist entries matched',
    filteredText: 'Filtered Text',
    pattern: 'Pattern',
    action: 'Action',
    severity: 'Severity',
    reject: 'Reject',
    flag: 'Flag',
    replace: 'Replace',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    inheritedFrom: 'Inherited from',
  },
  zh: {
    title: '屏蔽词测试',
    description: '测试文本是否匹配当前生效的屏蔽词规则',
    testContent: '测试内容',
    testContentPlaceholder: '输入要测试的文本...',
    scope: '作用域',
    runTest: '运行测试',
    testing: '测试中...',
    result: '结果',
    passed: '通过',
    blocked: '被屏蔽',
    flagged: '被标记',
    matches: '匹配项',
    noMatches: '没有匹配任何屏蔽词',
    filteredText: '过滤后文本',
    pattern: '模式',
    action: '动作',
    severity: '严重程度',
    reject: '拒绝',
    flag: '标记',
    replace: '替换',
    low: '低',
    medium: '中',
    high: '高',
    inheritedFrom: '继承自',
  },
  ja: {
    title: 'ブロックリストテスター',
    description: 'アクティブなブロックリストエントリに対してテキストをテスト',
    testContent: 'テストコンテンツ',
    testContentPlaceholder: 'ブロックリストルールに対してテストするテキストを入力...',
    scope: 'スコープ',
    runTest: 'テスト実行',
    testing: 'テスト中...',
    result: '結果',
    passed: 'パス',
    blocked: 'ブロック',
    flagged: 'フラグ付き',
    matches: 'マッチ',
    noMatches: 'ブロックリストエントリと一致しませんでした',
    filteredText: 'フィルター後のテキスト',
    pattern: 'パターン',
    action: 'アクション',
    severity: '重大度',
    reject: '拒否',
    flag: 'フラグ',
    replace: '置換',
    low: '低',
    medium: '中',
    high: '高',
    inheritedFrom: '継承元',
  },
};

export function BlocklistTester({
  scopeType = 'tenant',
  scopeId,
  locale = 'en',
}: BlocklistTesterProps) {
  const t = translations[locale];

  const [testText, setTestText] = useState('');
  const [selectedScope, setSelectedScope] = useState(scopeType);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!testText.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/v1/configuration-entity/blocklist-entry/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          scopeType: selectedScope,
          scopeId: scopeId,
          text: testText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to test blocklist');
      }

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
      } else {
        throw new Error(data.message || 'Test failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'reject':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'flag':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'replace':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const highlightMatches = (text: string, matches: BlocklistMatch[]) => {
    if (matches.length === 0) return text;

    // Sort matches by position (descending) to avoid offset issues
    const sortedMatches = [...matches].sort((a, b) => b.position.start - a.position.start);

    let result = text;
    for (const match of sortedMatches) {
      const before = result.slice(0, match.position.start);
      const matched = result.slice(match.position.start, match.position.end);
      const after = result.slice(match.position.end);
      result = `${before}<mark class="bg-red-200 px-0.5 rounded">${matched}</mark>${after}`;
    }

    return result;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="w-5 h-5" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t.testContent}</Label>
            <Textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder={t.testContentPlaceholder}
              rows={4}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label>{t.scope}</Label>
              <Select value={selectedScope} onValueChange={setSelectedScope as (value: string) => void}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="subsidiary">Subsidiary</SelectItem>
                  <SelectItem value="talent">Talent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleTest} disabled={isLoading || !testText.trim()} className="mt-6">
              {isLoading ? t.testing : t.runTest}
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        {/* Result Section */}
        {result && (
          <div className="space-y-4 pt-4 border-t">
            {/* Status */}
            <div
              className={`p-4 rounded-md border ${
                result.isBlocked
                  ? 'bg-red-50 border-red-200'
                  : result.matches.length > 0
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {result.isBlocked ? (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700">{t.blocked}</span>
                  </>
                ) : result.matches.length > 0 ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <span className="text-yellow-700">{t.flagged}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-green-700">{t.passed}</span>
                  </>
                )}
              </div>
            </div>

            {/* Highlighted Text */}
            {result.matches.length > 0 && (
              <div className="space-y-2">
                <Label>{t.testContent} ({t.matches})</Label>
                <div
                  className="p-3 bg-slate-50 border rounded-md whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: highlightMatches(result.originalText, result.matches),
                  }}
                />
              </div>
            )}

            {/* Filtered Text */}
            {result.filteredText !== result.originalText && (
              <div className="space-y-2">
                <Label>{t.filteredText}</Label>
                <div className="p-3 bg-slate-50 border rounded-md whitespace-pre-wrap">
                  {result.filteredText}
                </div>
              </div>
            )}

            {/* Matches List */}
            {result.matches.length > 0 ? (
              <div className="space-y-2">
                <Label>{t.matches} ({result.matches.length})</Label>
                <div className="space-y-2">
                  {result.matches.map((match, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-md bg-white flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {getActionIcon(match.action)}
                        <div>
                          <div className="font-mono text-sm">{match.pattern}</div>
                          <div className="text-xs text-muted-foreground">
                            Matched: "{match.matchedText}"
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getSeverityColor(match.severity)}>
                          {t[match.severity]}
                        </Badge>
                        <Badge variant="secondary">{t[match.action]}</Badge>
                        {match.ownerType !== 'talent' && (
                          <Badge variant="outline">
                            {t.inheritedFrom}: {match.ownerType}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">{t.noMatches}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
