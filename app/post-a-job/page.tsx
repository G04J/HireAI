import { NewJobWizard } from '@/app/employer/[employerId]/jobs/new/wizard';

/**
 * Public job posting page. Users can fill in job details without signing in.
 * When they click Publish or Save draft, they are redirected to sign up or login;
 * after auth they are sent to the employer job form (with draft restored if possible).
 */
export default function PostAJobPage() {
  return <NewJobWizard employerId={null} />;
}
