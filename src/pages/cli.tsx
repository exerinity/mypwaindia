import { useLocation } from 'react-router-dom';
import { usePageTitle } from '../hooks/page_title.js';
import { CliTerminal } from '../components/cli_terminal.tsx';

export default function CLIPage() {
  usePageTitle('MyCLiIndia');
  const location = useLocation();
  const fullscreen = location.pathname === '/i/flow/mci/focus';

  return <CliTerminal variant="page" fullscreen={fullscreen} />;
}
