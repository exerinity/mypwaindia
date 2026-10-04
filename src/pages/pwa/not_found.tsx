import { utility_classes } from '../../styles/utils.stylex.ts';
import { button_classes } from '../../styles/buttons.stylex.ts';
import { Link, useLocation } from 'react-router-dom';
import { usePageTitle } from '../../hooks/page_title.js';
import { ExternalIcon } from '../../components/ui/icons.tsx';

export default function NotFoundPage() {
  usePageTitle('MyPayIndia / ?', true);
  const { pathname } = useLocation();
  return (
    <>
      <h1 className={`mt-0 ${utility_classes.mt_0}`}>Nothing to see here...</h1>
      <p className={`mb-0 mt-0 ${utility_classes.mt_0}`}>The page or resource you're looking for either does not exist anymore, never existed in the first place, or you are not allowed to view it.</p>
      <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}>
        <Link to="/dash" className="btn">Back to dashboard</Link>
        <a
          href={`https://mypayindia.com${pathname}`}
          className="btn secondary"
          target="_blank"
          rel="noreferrer"
        >Try on MyPayIndia.com <ExternalIcon size={11} /></a>
      </div>
    </>
  );
}