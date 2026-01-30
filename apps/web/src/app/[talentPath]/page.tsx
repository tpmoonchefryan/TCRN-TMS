/* eslint-disable @typescript-eslint/no-explicit-any */
// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
// Talent Homepage (Public)

import {
    ExternalLink,
    Globe,
    MessageCircle,
    Twitter,
    Youtube
} from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// This would normally come from API
async function getTalentHomepage(talentPath: string) {
  // Mock data for demonstration
  const talents: Record<string, any> = {
    'sakura-miko': {
      displayName: 'さくらみこ',
      nameEn: 'Sakura Miko',
      bio: 'Elite shrine maiden VTuber from hololive. Singing, gaming, and chaos!',
      avatarUrl: null,
      socialLinks: [
        { platform: 'YouTube', url: 'https://youtube.com/@sakuramiko' },
        { platform: 'Twitter', url: 'https://twitter.com/sakuramiko35' },
        { platform: 'Bilibili', url: 'https://space.bilibili.com/366690056' },
      ],
      components: [
        {
          type: 'hero',
          config: {
            title: 'Welcome to Miko\'s Page!',
            subtitle: 'FAQ & Marshmallow 💕',
          },
        },
        {
          type: 'links',
          config: {
            title: 'Social Links',
            links: [
              { label: 'YouTube Channel', url: 'https://youtube.com/@sakuramiko', icon: 'youtube' },
              { label: 'Twitter/X', url: 'https://twitter.com/sakuramiko35', icon: 'twitter' },
            ],
          },
        },
      ],
      settings: {
        theme: 'sakura',
        primaryColor: '#FF69B4',
      },
      meta: {
        title: 'さくらみこ - Official Page',
        description: 'Welcome to Sakura Miko\'s official page. Send questions and messages!',
      },
    },
    'test-talent': {
      displayName: 'Test Talent',
      nameEn: 'Test Talent',
      bio: 'This is a test talent page for development.',
      avatarUrl: null,
      socialLinks: [],
      components: [],
      settings: {
        theme: 'default',
        primaryColor: '#3B82F6',
      },
      meta: {
        title: 'Test Talent - Official Page',
        description: 'Test talent page',
      },
    },
  };

  return talents[talentPath] || null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ talentPath: string }>;
}): Promise<Metadata> {
  const { talentPath } = await params;
  const homepage = await getTalentHomepage(talentPath);

  if (!homepage) {
    return { title: 'Not Found' };
  }

  return {
    title: homepage.meta.title,
    description: homepage.meta.description,
    openGraph: {
      title: homepage.meta.title,
      description: homepage.meta.description,
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: homepage.meta.title,
      description: homepage.meta.description,
    },
  };
}

export default async function TalentHomepage({
  params,
}: {
  params: Promise<{ talentPath: string }>;
}) {
  const { talentPath } = await params;
  const homepage = await getTalentHomepage(talentPath);

  if (!homepage) {
    notFound();
  }

  const primaryColor = homepage.settings.primaryColor || '#3B82F6';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <div 
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}05 100%)`,
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center">
          {/* Avatar */}
          <div 
            className="w-32 h-32 mx-auto rounded-full border-4 border-white shadow-xl flex items-center justify-center text-4xl font-bold"
            style={{ 
              backgroundColor: `${primaryColor}20`,
              color: primaryColor,
            }}
          >
            {homepage.displayName[0]}
          </div>

          {/* Name */}
          <h1 className="mt-6 text-3xl sm:text-4xl font-bold text-foreground">
            {homepage.displayName}
          </h1>
          <p className="text-muted-foreground">{homepage.nameEn}</p>

          {/* Bio */}
          {homepage.bio && (
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              {homepage.bio}
            </p>
          )}

          {/* Social Links */}
          {homepage.socialLinks.length > 0 && (
            <div className="mt-8 flex justify-center gap-4">
              {homepage.socialLinks.map((link: any) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow"
                  title={link.platform}
                >
                  {link.platform === 'YouTube' && <Youtube className="w-6 h-6 text-red-500" />}
                  {link.platform === 'Twitter' && <Twitter className="w-6 h-6 text-blue-400" />}
                  {link.platform === 'Bilibili' && <Globe className="w-6 h-6 text-blue-500" />}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Marshmallow CTA */}
        <div className="mb-12">
          <Link
            href={`/${talentPath}/marshmallow`}
            className="block p-6 rounded-2xl border-2 border-dashed hover:border-solid transition-all"
            style={{ borderColor: primaryColor }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="p-4 rounded-full"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <MessageCircle 
                    className="w-8 h-8" 
                    style={{ color: primaryColor }}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Send a Marshmallow</h2>
                  <p className="text-muted-foreground">
                    Ask questions or send messages anonymously
                  </p>
                </div>
              </div>
              <ExternalLink className="w-6 h-6 text-muted-foreground" />
            </div>
          </Link>
        </div>

        {/* Components */}
        {homepage.components.map((component: any, index: number) => (
          <div key={index} className="mb-8">
            {component.type === 'hero' && (
              <div className="text-center py-8">
                <h2 className="text-2xl font-bold">{component.config.title}</h2>
                {component.config.subtitle && (
                  <p className="mt-2 text-muted-foreground">{component.config.subtitle}</p>
                )}
              </div>
            )}

            {component.type === 'links' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">{component.config.title}</h3>
                <div className="space-y-3">
                  {component.config.links.map((link: any, linkIndex: number) => (
                    <a
                      key={linkIndex}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-lg bg-card border hover:shadow-md transition-shadow"
                    >
                      {link.icon === 'youtube' && <Youtube className="w-5 h-5 text-red-500" />}
                      {link.icon === 'twitter' && <Twitter className="w-5 h-5 text-blue-400" />}
                      <span className="font-medium">{link.label}</span>
                      <ExternalLink className="w-4 h-4 ml-auto text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by TCRN TMS</p>
        </div>
      </footer>
    </div>
  );
}
