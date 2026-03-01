'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserCircle, Settings, LogOut } from 'lucide-react';

type AuthNavProps = {
  user: { email?: string } | null;
  profileHref?: string;
  settingsHref?: string;
};

export function AuthNav({ user, profileHref, settingsHref }: AuthNavProps) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  if (user) {
    return (
      <div className="pl-1.5 ml-1 border-l border-white/10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9 text-slate-300 hover:text-white hover:bg-white/10 border-0 focus-visible:ring-0"
              aria-label="Open profile menu"
            >
              <Avatar className="h-8 w-8 rounded-full border border-white/20">
                <AvatarFallback className="bg-purple-600/30 text-purple-300 rounded-full text-base">
                  <UserCircle className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-slate-900 border-white/10 text-white"
          >
            <DropdownMenuLabel className="text-slate-400 font-normal text-xs truncate">
              {user.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {profileHref && (
              <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/10 focus:text-white">
                <Link href={profileHref} className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  User profile
                </Link>
              </DropdownMenuItem>
            )}
            {settingsHref && (
              <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/10 focus:text-white">
                <Link href={settingsHref} className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
            )}
            {(profileHref || settingsHref) && <DropdownMenuSeparator className="bg-white/10" />}
            <DropdownMenuItem
              onClick={signOut}
              className="cursor-pointer focus:bg-red-500/20 focus:text-red-300 text-slate-300"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 pl-1.5 ml-1 border-l border-white/10">
      <Button variant="ghost" size="sm" asChild className="text-slate-300 hover:text-white hover:bg-white/10">
        <Link href="/login">Sign in</Link>
      </Button>
      <Button size="sm" asChild className="bg-purple-600 hover:bg-purple-500 text-white border-0">
        <Link href="/signup">Sign up</Link>
      </Button>
    </div>
  );
}
