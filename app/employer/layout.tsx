import { redirect } from 'next/navigation';
import { getEmployerIdForRequest } from '@/lib/employer-default';

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const employerId = await getEmployerIdForRequest();
  if (!employerId) redirect('/login?next=/employer');
  return <>{children}</>;
}
