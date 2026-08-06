import { useNavigate, useParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks/page_title.js';
import { ChatWidget } from '../../components/converse/converse_widget.tsx';

export default function ChatPage() {
  usePageTitle('Converse');
  const navigate = useNavigate();
  const { peer: peerParam } = useParams<{ peer?: string }>();

  return (
    <ChatWidget
      variant="page"
      routePeer={peerParam ?? ''}
      onSelectPeer={(peer) => navigate(`/i/converse/${peer}`)}
      onBack={() => navigate('/i/converse')}
    />
  );
}
