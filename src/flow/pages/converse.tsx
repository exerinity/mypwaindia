import { useNavigate, useParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks/page_title.js';
import { ChatWidget } from '../../components/chat/chat_widget.tsx';

export default function ChatPage() {
  usePageTitle('MyChatIndia');
  const navigate = useNavigate();
  const { peer: peerParam } = useParams<{ peer?: string }>();

  return (
    <ChatWidget
      variant="page"
      routePeer={peerParam ?? ''}
      onSelectPeer={(peer) => navigate(`/i/chat/${peer}`)}
      onBack={() => navigate('/i/chat')}
    />
  );
}
